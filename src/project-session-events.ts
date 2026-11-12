import { importJWK } from 'jose';
import {
  sessionEventContentType, sessionEventMaxDelay, sessionEventPublicKey,
  sessionRevocationPath, signSessionRevocation,
} from '../packages/auth/session-revocation.ts';
import type { IdentityClient } from './identity.ts';

export interface ProjectSessionEventEnv {
  WORLDS_SESSION_EVENT_CLIENT_IDS?: string;
  WORLDS_SESSION_EVENT_PRIVATE_JWK?: string;
}

export interface ProjectSessionEvents {
  signer: string;
  audiences: string[];
  identityIssuer: string;
  jwk: NonNullable<ReturnType<typeof sessionEventPublicKey>> & { d: string };
  db: D1Database;
}

interface Delivery {
  audience: string;
  identity_issuer: string;
  subject: string;
  event_id: string;
  revoked_through: number;
}

export function projectSessionEventConfig(
  env: ProjectSessionEventEnv,
  origin: string,
  identityIssuer: string,
  clients: IdentityClient[],
  db: D1Database,
): ProjectSessionEvents | undefined {
  if (!env.WORLDS_SESSION_EVENT_CLIENT_IDS || !env.WORLDS_SESSION_EVENT_PRIVATE_JWK) return;
  try {
    const ids: unknown = JSON.parse(env.WORLDS_SESSION_EVENT_CLIENT_IDS);
    const { d, ...publicFields } = JSON.parse(env.WORLDS_SESSION_EVENT_PRIVATE_JWK);
    const publicKey = sessionEventPublicKey(JSON.stringify(publicFields));
    if (!publicKey || typeof d !== 'string' || !/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(d) ||
        !Array.isArray(ids) || !ids.length || ids.length > 4 || new Set(ids).size !== ids.length) return;
    const audiences: string[] = [];
    for (const id of ids) {
      const client = clients.find(candidate => candidate.clientId === id);
      if (client?.redirects.length !== 1) return;
      const callback = new URL(client.redirects[0]);
      if (callback.protocol !== 'https:' || callback.origin === origin ||
          callback.href !== callback.origin + '/auth/callback' || client.resource !== callback.origin + '/api') return;
      audiences.push(callback.origin + sessionRevocationPath);
    }
    if (new Set(audiences).size !== audiences.length) return;
    return { signer:origin, audiences, identityIssuer, db, jwk:{ ...publicKey, d } };
  } catch { return; }
}

export function queueProjectRevocation(config: ProjectSessionEvents, subject: string, cutoff: number) {
  return config.audiences.map(audience => config.db.prepare(`
    INSERT INTO project_session_revocation_delivery
      (audience,identity_issuer,subject,event_id,revoked_through,expires_at,next_attempt)
    VALUES (?,?,?,?,?,?,?)
    ON CONFLICT (audience,identity_issuer,subject) DO UPDATE SET
      event_id=excluded.event_id,revoked_through=excluded.revoked_through,
      expires_at=excluded.expires_at,next_attempt=excluded.next_attempt
    WHERE project_session_revocation_delivery.revoked_through<excluded.revoked_through
  `).bind(audience,config.identityIssuer,subject,crypto.randomUUID(),cutoff,cutoff+sessionEventMaxDelay,cutoff));
}

export async function deliverProjectRevocations(
  config: ProjectSessionEvents,
  subject?: string,
  now = Date.now(),
) {
  const placeholders = config.audiences.map(() => '?').join(',');
  const scope = `identity_issuer=? AND expires_at>? AND audience IN (${placeholders})${subject===undefined?'':' AND subject=?'}`;
  const scopedValues = [config.identityIssuer, now, ...config.audiences, ...(subject===undefined?[]:[subject])];
  const { results } = await config.db.prepare(`
    UPDATE project_session_revocation_delivery SET next_attempt=? WHERE event_id IN (
      SELECT event_id FROM project_session_revocation_delivery
      WHERE ${scope} AND next_attempt<=?
      ORDER BY next_attempt,expires_at LIMIT 20
    ) RETURNING audience,identity_issuer,subject,event_id,revoked_through
  `).bind(now+60_000, ...scopedValues, now).all<Delivery>();
  const privateKey = await importJWK(config.jwk,'EdDSA');
  if (!(privateKey instanceof CryptoKey)) throw new Error('Invalid session event key');
  const resultsByRecipient = await Promise.all(results.map(async row => {
    try {
      const signed = await signSessionRevocation({
        eventId: row.event_id, identityIssuer: row.identity_issuer,
        subject: row.subject, revokedThrough: row.revoked_through,
      }, config.signer, row.audience, { kid: config.jwk.kid, privateKey }, now);
      const response = await fetch(row.audience, {
        method:'POST', redirect:'error', signal:AbortSignal.timeout(5000),
        headers:{ 'content-type':sessionEventContentType, accept:'application/json' },
        body:signed,
      });
      await response.body?.cancel();
      if (response.status !== 202) return false;
      // A delayed acknowledgement must never delete a newly queued event.
      await config.db.prepare('DELETE FROM project_session_revocation_delivery WHERE event_id=?')
        .bind(row.event_id).run();
      return true;
    } catch { return false; }
  }));
  if (subject===undefined) return resultsByRecipient.every(Boolean);
  // A scheduled delivery may already have claimed some rows. Count those as
  // pending until their acknowledgement is committed.
  const pending = await config.db.prepare(`
    SELECT 1 FROM project_session_revocation_delivery WHERE ${scope} LIMIT 1
  `).bind(...scopedValues).first();
  return !pending;
}

export async function pruneProjectRevocationDeliveries(config: ProjectSessionEvents, now: number) {
  const removed = await config.db.prepare(`
    DELETE FROM project_session_revocation_delivery WHERE event_id IN (
      SELECT event_id FROM project_session_revocation_delivery WHERE expires_at<=?
      ORDER BY expires_at LIMIT 500
    )
  `).bind(now).run();
  return removed.meta.changes;
}
