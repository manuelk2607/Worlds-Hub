import { createAuthServer, NEON_AUTH_SESSION_COOKIE_NAME, resolveNeonAuthLogging } from '@neon/auth/server';
import { sessionEventMaxDelay, sessionRevocationPath } from '../packages/auth/session-revocation.ts';
import { revokeHubSessionStatements } from './hub-session-revocation.ts';
import { receiptErasureDigest, type ReceiptErasureEnv } from './migration-receipts.ts';
import type { ProjectSessionEvents } from './project-session-events.ts';
import { projects } from './projects.ts';

export interface IdentityDeletionEnv extends ReceiptErasureEnv {
  IDENTITY_ACCOUNT_DELETION_ENABLED?: string;
  IDENTITY_DELETION_ISSUER?: string;
  IDENTITY_DELETION_ADMIN_SUBJECT?: string;
  IDENTITY_DELETION_ADMIN_SESSION?: string;
}

export interface IdentityDeletion {
  issuer: string;
  db: D1Database;
  projects: ProjectSessionEvents;
  adminSubject: string;
  remove(subject: string): Promise<void>;
}

type AdminResult<T> = { data: T | null; error: unknown };
type AdminApi = {
  listUsers(input: { query: { filterField: string; filterOperator: 'eq'; filterValue: string; limit: number } }):
    Promise<AdminResult<{ users: { id: string }[]; total: number }>>;
  removeUser(input: { userId: string }): Promise<AdminResult<unknown>>;
};

const validSubject = (id: string) => /^[A-Za-z0-9_-]{1,256}$/.test(id);
const quiet = resolveNeonAuthLogging({ logLevel: 'silent' });

function providerSessionCookie(value: string | undefined) {
  if (!value || value.length > 1536) return;
  try {
    // Neon SDK callbacks expose the decoded cookie, while browser headers use its wire form.
    const decoded = decodeURIComponent(value);
    if (/^[A-Za-z0-9_.=+/_-]{20,512}$/.test(decoded)) return encodeURIComponent(decoded);
  } catch { return; }
}

export function identityDeletionConfig(
  env: IdentityDeletionEnv, issuer: string, cookieSecret: string,
  db: D1Database, recipients: ProjectSessionEvents | undefined,
): IdentityDeletion | undefined {
  const adminSubject = env.IDENTITY_DELETION_ADMIN_SUBJECT;
  const adminSession = providerSessionCookie(env.IDENTITY_DELETION_ADMIN_SESSION);
  if (env.IDENTITY_ACCOUNT_DELETION_ENABLED !== 'true' || env.MIGRATION_RECEIPT_ERASURE_ENABLED !== 'true' ||
      env.IDENTITY_DELETION_ISSUER !== issuer ||
      !adminSubject || !validSubject(adminSubject) || !adminSession ||
      recipients?.identityIssuer !== issuer || recipients.db !== db) return;
  const expected = projects.flatMap(project => project.url ? [new URL(project.url).origin + sessionRevocationPath] : []);
  if (recipients.audiences.length !== expected.length ||
      !expected.every(audience => recipients.audiences.includes(audience) && recipients.recipients?.has(audience))) return;
  return {
    issuer, db, projects: recipients, adminSubject,
    async remove(subject) {
      if (!validSubject(subject) || subject === adminSubject) throw new Error('Invalid deletion target');
      const admin = createAuthServer({
        baseUrl: issuer, cookieSecret, sessionDataTtl: 1, log: quiet,
        context: () => ({
          getCookies: () => NEON_AUTH_SESSION_COOKIE_NAME + '=' + adminSession,
          setCookie: () => {},
          getOrigin: () => new URL(issuer).origin,
          getHeader: () => null,
          getFramework: () => 'worlds-hub',
        }),
      });
      const session = await admin.getSession({ query: { disableCookieCache: true, disableRefresh: true } });
      const user = session.data?.user as { id: string; role?: unknown } | undefined;
      if (session.error || user?.id !== adminSubject || session.data?.session?.userId !== adminSubject ||
          typeof user.role !== 'string' || !user.role.split(',').includes('admin')) {
        throw new Error('Deletion administration is unavailable');
      }
      const api = admin.admin as AdminApi;
      const exists = async () => {
        const result = await api.listUsers({ query: { filterField: 'id', filterOperator: 'eq', filterValue: subject, limit: 2 } });
        const { users, total } = result.data ?? {};
        if (result.error || !Array.isArray(users) || total !== users.length ||
            users.length > 1 || users.some(row => row.id !== subject)) throw new Error('Deletion target lookup failed');
        return users.length === 1;
      };
      if (!(await exists())) return;
      const result = await api.removeUser({ userId: subject });
      if (result.error || await exists()) throw new Error('Provider deletion was not confirmed');
    },
  };
}

export async function requestAccountDeletion(config: IdentityDeletion, subject: string, now = Date.now()) {
  if (!validSubject(subject) || subject === config.adminSubject) throw new Error('Invalid deletion target');
  await config.db.prepare(`INSERT INTO identity_deletion_jobs (issuer,subject,requested_at,next_attempt)
    VALUES (?,?,?,?) ON CONFLICT(issuer,subject) DO NOTHING`).bind(config.issuer,subject,now,now).run();
}

export async function processAccountDeletion(config: IdentityDeletion, now = Date.now(), subject?: string) {
  // Keep the lock long enough for an in-flight SDK request. A lost response is
  // recovered by verifying provider absence before a subsequent removal.
  const job = await config.db.prepare(`UPDATE identity_deletion_jobs SET next_attempt=?
    WHERE issuer=? AND subject=(SELECT subject FROM identity_deletion_jobs
      WHERE issuer=? AND removed_at IS NULL AND next_attempt<=? AND (? IS NULL OR subject=?)
      ORDER BY requested_at LIMIT 1)
    RETURNING subject`).bind(now + 10 * 60_000,config.issuer,config.issuer,now,subject??null,subject??null).first<{subject:string}>();
  if (!job) return false;
  await config.remove(job.subject);
  const finishedAt = Math.max(now,Date.now());
  const erasedDigest = await receiptErasureDigest(config.issuer,job.subject);
  await config.db.batch([
    config.db.prepare(`UPDATE identity_deletion_jobs SET removed_at=?
      WHERE issuer=? AND subject=? AND removed_at IS NULL`).bind(finishedAt,config.issuer,job.subject),
    ...revokeHubSessionStatements(config.db,config.issuer,job.subject,finishedAt,config.projects),
    config.db.prepare('DELETE FROM user_preferences WHERE issuer=? AND subject=?').bind(config.issuer,job.subject),
    config.db.prepare('INSERT OR IGNORE INTO erased_identity_receipts(subject_digest) VALUES (?)').bind(erasedDigest),
    config.db.prepare('DELETE FROM migration_receipts WHERE identity_issuer=? AND subject=?').bind(config.issuer,job.subject),
  ]);
  return true;
}

export async function pruneCompletedAccountDeletions(config: IdentityDeletion, now: number) {
  await config.db.prepare(`DELETE FROM identity_deletion_jobs WHERE rowid IN (
    SELECT job.rowid FROM identity_deletion_jobs job
    WHERE job.issuer=? AND job.removed_at<?
      AND NOT EXISTS (SELECT 1 FROM project_session_revocation_delivery pending
        WHERE pending.identity_issuer=job.issuer AND pending.subject=job.subject)
    ORDER BY removed_at LIMIT 100)`).bind(config.issuer,now-sessionEventMaxDelay).run();
}
