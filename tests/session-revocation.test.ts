import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { PostgresAuthStore } from '../packages/auth/postgres-store.ts';
import {
  receiveSessionRevocation, sessionEventContentType, sessionEventMaxDelay,
  sessionEventPublicKey, sessionRevocationPath, sessionRevokedEvent, signSessionRevocation,
} from '../packages/auth/session-revocation.ts';

const now = Date.UTC(2026, 10, 12, 12, 0);
const signer = 'https://worlds-hub.example';
const audience = 'https://sprachwelten.example' + sessionRevocationPath;
const identityIssuer = 'https://identity.example/worlds/auth';
const event = { eventId: 'session-revocation-fixture', identityIssuer, subject: 'account-1', revokedThrough: now - 60_000 };
const keyPair = await generateKeyPair('EdDSA');
const key = { kid: 'worlds-session-events-1', privateKey: keyPair.privateKey };
const pinned = sessionEventPublicKey(JSON.stringify({ kid: key.kid, ...await exportJWK(keyPair.publicKey) }))!;
const trust = { signer, audience, identityIssuer, key: pinned };
const request = (raw: string, url = audience, contentType = sessionEventContentType) => new Request(url, {
  method: 'POST', headers: { 'content-type': contentType, accept: 'application/json' }, body: raw,
});

test('accepts only fresh security events for the pinned Hub, project and subject issuer', async () => {
  assert.ok(pinned);
  assert.equal(sessionEventPublicKey(JSON.stringify({ ...pinned, d: 'private' })), undefined);
  const valid = await signSessionRevocation(event, signer, audience, key, now);
  const updates: typeof event[] = [];
  const apply = async (value: typeof event) => { updates.push(value); };
  const ack = await receiveSessionRevocation(request(valid), trust, apply, now);
  assert.equal(ack.status, 202);
  assert.equal(await ack.text(), '');
  assert.deepEqual(updates, [event]);
  assert.equal((await receiveSessionRevocation(request(valid, audience + '?next=other'), trust, apply, now)).status, 404);
  assert.equal((await receiveSessionRevocation(request(valid, audience, 'application/jwt'), trust, apply, now)).status, 415);
  const untrusted = await generateKeyPair('EdDSA');
  for (const raw of await Promise.all([
    signSessionRevocation(event, 'https://wrong.example', audience, key, now),
    signSessionRevocation(event, signer, 'https://music.example' + sessionRevocationPath, key, now),
    signSessionRevocation({ ...event, identityIssuer: 'https://other-identity.example' }, signer, audience, key, now),
    signSessionRevocation(event, signer, audience, { ...key, kid: 'other' }, now),
    signSessionRevocation(event, signer, audience, { ...key, privateKey: untrusted.privateKey }, now),
    signSessionRevocation(event, signer, audience, key, now - 600_000),
    signSessionRevocation(event, signer, audience, key, now + 60_000),
    signSessionRevocation({ ...event, revokedThrough: now - sessionEventMaxDelay - 1000 }, signer, audience, key, now),
    signSessionRevocation({ ...event, revokedThrough: now + 1000 }, signer, audience, key, now),
    new SignJWT({
      sub_id: { format: 'iss_sub', iss: identityIssuer, sub: event.subject },
      events: { [sessionRevokedEvent]: { event_timestamp: Math.floor(now / 1000) } },
    }).setProtectedHeader({ alg: 'EdDSA', typ: 'JWT', kid: key.kid })
      .setIssuer(signer).setAudience(audience).setJti(event.eventId).setIssuedAt(Math.floor(now / 1000)).sign(key.privateKey),
  ])) {
    assert.equal((await receiveSessionRevocation(request(raw), trust, apply, now)).status, 400);
  }
  assert.equal((await receiveSessionRevocation(request('X'.repeat(4097)), trust, apply, now)).status, 400);
  assert.deepEqual(updates, [event]);
  assert.equal((await receiveSessionRevocation(request(valid), trust, async () => { throw new Error('test outage'); }, now)).status, 503);
});

test('Postgres acknowledgement is repeatable and fences older sessions without affecting later or unrelated logins', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE TABLE worlds_auth_sessions(id text PRIMARY KEY,issuer text NOT NULL,subject text NOT NULL,sid text,payload jsonb NOT NULL,expires bigint NOT NULL);
      CREATE TABLE worlds_session_revocations(issuer text NOT NULL,subject text NOT NULL,revoked_through bigint NOT NULL,PRIMARY KEY(issuer,subject));
    `);
    const query = async (sql:string, params:unknown[]) => (await db.query<Record<string,unknown>>(sql, params)).rows;
    const store = new PostgresAuthStore(query, true);
    const session = { issuer:identityIssuer, sub:event.subject, csrf:'synthetic-csrf', expires:Date.now() + 60_000 };
    await store.putSession('old', { ...session, authenticatedAt:event.revokedThrough });
    await store.putSession('unknown', session);
    await store.putSession('fresh', { ...session, authenticatedAt:now });
    await store.putSession('other', { ...session, sub:'account-2' });
    await store.putSession('other-issuer', { ...session, issuer:'https://other-identity.example' });
    const valid = await signSessionRevocation(event, signer, audience, key, now);
    for(let retry=0;retry<2;retry++){
      const ack=await receiveSessionRevocation(request(valid),trust,value=>store.applySessionRevocation(value),now);
      assert.equal(ack.status,202);
    }
    await store.applySessionRevocation({ ...event, revokedThrough:event.revokedThrough - 1000 });
    assert.equal(await store.getSession('old'),null);
    assert.equal(await store.getSession('unknown'),null);
    for (const retained of ['fresh','other','other-issuer']) assert.ok(await store.getSession(retained));
    await assert.rejects(store.putSession('late',session),/predates sign-out/);
    const oldWriter = new PostgresAuthStore(query);
    await oldWriter.putSession('concurrent-old-write',session);
    assert.equal(await store.getSession('concurrent-old-write'),null);
    await store.putSession('new-after-retry',{ ...session, authenticatedAt:now + 1000 });
    assert.ok(await store.getSession('new-after-retry'));
    assert.equal((await query('SELECT revoked_through FROM worlds_session_revocations',[]))[0]?.revoked_through,event.revokedThrough);
  } finally {
    await db.close();
  }
});
