import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { migrationReceiptType } from '../packages/auth/migration-receipts.ts';
import { sessionEventMaxDelay, sessionRevocationPath } from '../packages/auth/session-revocation.ts';
import {
  identityDeletionConfig, processAccountDeletion, pruneCompletedAccountDeletions, requestAccountDeletion,
} from '../src/identity-deletion.ts';
import { migrationConfig, receiptErasureDigest, receiveMigrationReceipt } from '../src/migration-receipts.ts';
import { productionProjectSessionEventConfig, productionSessionServices } from '../src/project-session-events.ts';
import { sqliteD1 } from './sqlite-helper.ts';

const issuer = 'https://auth.example/worlds/auth';
const hub = 'https://worlds-hub.maki26.workers.dev';
const owner = 'owner-fixture';
const admin = 'admin-fixture';
const adminCookie = 'test-admin-cookie-fixture.a+b/c=';
const control = 'control-fixture';

test('deletion confirms the exact target, recovers failed cleanup and fences late Hub writes', async t => {
  const { db, binding } = await sqliteD1();
  t.after(() => db.close());
  for (const file of [
    '0003_user_preferences.sql', '0004_migration_receipts.sql', '0005_hub_session_revocations.sql',
    '0006_project_session_revocation_delivery.sql', '0007_identity_deletion.sql', '0008_identity_receipt_erasure.sql',
  ]) db.exec(await readFile('migrations/' + file, 'utf8'));

  const { privateKey } = await generateKeyPair('EdDSA', { extractable: true });
  const clients = productionSessionServices.map(({ service }) => {
    const origin = `https://${service}.maki26.workers.dev`;
    return { clientId: service, name: service, redirects: [origin + '/auth/callback'], resource: origin + '/api' };
  });
  const projectConfig = productionProjectSessionEventConfig({
    WORLDS_SESSION_EVENT_PRIVATE_JWK: JSON.stringify({ kid: 'delete-fixture', ...await exportJWK(privateKey) }),
    ...Object.fromEntries(productionSessionServices.map(({ binding }) => [
      binding, { fetch: async () => new Response(null, { status: 202 }) },
    ])),
  }, hub, issuer, clients, binding)!;
  const env = {
    IDENTITY_ACCOUNT_DELETION_ENABLED: 'true',
    MIGRATION_RECEIPT_ERASURE_ENABLED: 'true',
    IDENTITY_DELETION_ISSUER: issuer,
    IDENTITY_DELETION_ADMIN_SUBJECT: admin,
    IDENTITY_DELETION_ADMIN_SESSION: adminCookie,
  };
  const cookieSecret = 'test-only-cookie-key-at-least-32-characters';
  assert.equal(identityDeletionConfig({}, issuer, cookieSecret, binding, projectConfig), undefined);
  assert.equal(identityDeletionConfig({ ...env, MIGRATION_RECEIPT_ERASURE_ENABLED: 'false' }, issuer, cookieSecret, binding, projectConfig), undefined);
  assert.equal(identityDeletionConfig(env, 'https://foreign.example', cookieSecret, binding, projectConfig), undefined);
  assert.equal(identityDeletionConfig(env, issuer, cookieSecret, binding, { ...projectConfig, recipients: new Map() }), undefined);
  for (const invalidCookie of ['valid-looking-session-cookie%0A', 'valid-looking-session-cookie%253B', 'valid-looking-session-cookie;other=secret']) {
    assert.equal(identityDeletionConfig({ ...env, IDENTITY_DELETION_ADMIN_SESSION: invalidCookie }, issuer, cookieSecret, binding, projectConfig), undefined);
  }
  assert.ok(identityDeletionConfig({ ...env, IDENTITY_DELETION_ADMIN_SESSION: encodeURIComponent(adminCookie) }, issuer, cookieSecret, binding, projectConfig));
  const config = identityDeletionConfig(env, issuer, cookieSecret, binding, projectConfig)!;
  assert.ok(config);

  const now = Date.now();
  const users = new Set([admin, owner, control]);
  const removals: string[] = [];
  let providerRole = 'user';
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    assert.ok(url.href.startsWith(issuer + '/'));
    assert.ok(request.headers.get('cookie')?.endsWith('=' + encodeURIComponent(adminCookie)));
    if (url.pathname.endsWith('/get-session')) {
      return Response.json({ user: { id: admin, role: providerRole }, session: { userId: admin } });
    }
    if (url.pathname.endsWith('/admin/list-users')) {
      assert.equal(url.searchParams.get('filterField'), 'id');
      assert.equal(url.searchParams.get('filterValue'), owner);
      const matches = users.has(owner) ? [{ id: owner }] : [];
      return Response.json({ users: matches, total: matches.length });
    }
    assert.ok(url.pathname.endsWith('/admin/remove-user'));
    const { userId } = await request.json() as { userId: string };
    assert.equal(userId, owner);
    removals.push(userId);
    users.delete(userId);
    return Response.json({ success: true });
  });

  const insertSession = db.prepare('INSERT INTO auth_sessions (id,issuer,subject,payload,expires) VALUES (?,?,?,?,?)');
  const preference = db.prepare('INSERT INTO user_preferences VALUES (?,?,?,?)');
  const receipt = db.prepare('INSERT INTO migration_receipts VALUES (?,?,?,?,?,?,?)');
  const accountRef = (subject: string) => (subject === owner ? 'a' : 'b').repeat(64);
  for (const subject of [owner, control]) {
    insertSession.run(subject, issuer, subject, '{}', now + 1000);
    preference.run(issuer, subject, 'en', now);
    receipt.run('it-worlds', issuer, subject, accountRef(subject), 1, 'confirmed', now);
  }
  await assert.rejects(requestAccountDeletion(config, admin, now));
  await requestAccountDeletion(config, owner, now);
  await requestAccountDeletion(config, owner, now + 1);
  assert.equal(await processAccountDeletion(config, now, control), false);
  await assert.rejects(processAccountDeletion(config, now), /administration is unavailable/);
  assert.deepEqual(removals, []);
  assert.equal(await processAccountDeletion(config, now + 1, owner), false);

  providerRole = 'admin';
  db.exec(`CREATE TRIGGER simulate_store_failure BEFORE DELETE ON migration_receipts
    BEGIN SELECT RAISE(ABORT, 'simulated storage failure'); END;`);
  const retry = now + 10 * 60_000;
  await assert.rejects(processAccountDeletion(config, retry, owner), /simulated storage failure/);
  assert.deepEqual(removals, [owner]);
  assert.ok(db.prepare('SELECT 1 FROM auth_sessions WHERE subject=?').get(owner));
  assert.equal(db.prepare('SELECT removed_at FROM identity_deletion_jobs').get()?.removed_at, null);
  assert.equal(db.prepare('SELECT COUNT(*) AS total FROM project_session_revocation_delivery').get()?.total, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS total FROM erased_identity_receipts').get()?.total, 0);

  db.exec('DROP TRIGGER simulate_store_failure');
  const finalAttempt = retry + 10 * 60_000;
  assert.equal(await processAccountDeletion(config, finalAttempt, owner), true);
  assert.equal(await processAccountDeletion(config, finalAttempt, owner), false);
  assert.deepEqual(removals, [owner]);
  assert.deepEqual([...users], [admin, control]);
  for (const table of ['auth_sessions', 'user_preferences', 'migration_receipts']) {
    assert.deepEqual(db.prepare(`SELECT subject FROM ${table}`).all().map(row => row.subject), [control]);
  }
  const deliveries = db.prepare('SELECT audience,subject FROM project_session_revocation_delivery ORDER BY audience').all();
  assert.deepEqual(deliveries.map(row => row.audience), clients.map(client => new URL(client.resource).origin + sessionRevocationPath).sort());
  assert.ok(deliveries.every(row => row.subject === owner));
  assert.throws(() => insertSession.run('late', issuer, owner, '{}', finalAttempt + 1000), /Worlds identity removed/);
  assert.throws(() => preference.run(issuer, owner, 'de', finalAttempt), /Worlds identity removed/);
  assert.equal(receipt.run('it-worlds', issuer, owner, accountRef(owner), 2, 'confirmed', finalAttempt).changes, 0);
  await pruneCompletedAccountDeletions(config, finalAttempt + sessionEventMaxDelay + 1000);
  assert.equal(db.prepare('SELECT COUNT(*) AS total FROM identity_deletion_jobs').get()?.total, 1);
  db.exec('DELETE FROM project_session_revocation_delivery');
  await pruneCompletedAccountDeletions(config, finalAttempt + sessionEventMaxDelay + 1000);
  assert.equal(db.prepare('SELECT COUNT(*) AS total FROM identity_deletion_jobs').get()?.total, 0);
  const markers = db.prepare('SELECT subject_digest FROM erased_identity_receipts').all();
  assert.deepEqual(markers.map(row => row.subject_digest), [await receiptErasureDigest(issuer, owner)]);
  assert.doesNotMatch(JSON.stringify(markers), /owner-fixture|auth\.example/);

  const signingKey = await generateKeyPair('EdDSA', { extractable: true });
  const kid = 'receipt-fixture';
  const migration = migrationConfig({
    MIGRATION_RECEIPTS_ENABLED: 'true', MIGRATION_RECEIPT_ERASURE_ENABLED: 'true',
    MIGRATION_RECEIPT_KEYS: JSON.stringify({ 'it-worlds': { kid, ...await exportJWK(signingKey.publicKey) } }),
  }, hub, issuer, binding)!;
  async function deliver(subject: string) {
    const url = hub + '/api/migrations/receipts/it-worlds';
    const body = await new SignJWT({ identity_issuer: issuer, account_ref: accountRef(subject), revision: 2, state: 'confirmed' })
      .setProtectedHeader({ alg: 'EdDSA', typ: migrationReceiptType, kid })
      .setIssuer('https://it-worlds.maki26.workers.dev').setAudience(url).setSubject(subject)
      .setIssuedAt().setExpirationTime('4m').sign(signingKey.privateKey);
    return receiveMigrationReceipt(new Request(url, { method: 'POST', headers: { 'content-type': 'application/jwt' }, body }), migration);
  }
  assert.deepEqual(await (await deliver(owner)).json(), { result: 'stale' });
  assert.deepEqual(await (await deliver(control)).json(), { result: 'stored' });
  assert.equal(db.prepare('SELECT revision FROM migration_receipts WHERE subject=?').get(control)?.revision, 2);
  assert.equal(db.prepare('SELECT 1 FROM migration_receipts WHERE subject=?').get(owner), undefined);
});
