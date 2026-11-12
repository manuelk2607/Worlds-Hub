import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { exportJWK, generateKeyPair } from 'jose';
import { PostgresAuthStore } from '../packages/auth/postgres-store.ts';
import { PGlite } from '@electric-sql/pglite';
import {
  receiveSessionRevocation, sessionEventPublicKey, sessionEventMaxDelay, type SessionRevocation,
} from '../packages/auth/session-revocation.ts';
import {
  deliverProjectRevocations, projectSessionEventConfig, pruneProjectRevocationDeliveries,
} from '../src/project-session-events.ts';
import { revokeHubSessions } from '../src/hub-session-revocation.ts';
import { D1AuthStore } from '../packages/auth/store.ts';
import { sqliteD1 } from './sqlite-helper.ts';

const now = Date.UTC(2026, 10, 12, 13, 0);
const origin = 'https://worlds-hub.example';
const issuer = 'https://provider.example/worlds/auth';
const subject = 'fixture-1';
const clients = ['sprachwelten','slop-urself'].map(id => ({
  clientId:id, name:id, redirects:[`https://${id}.example/auth/callback`], resource:`https://${id}.example/api`,
}));

test('queued delivery verifies end to end and retries only unacknowledged projects with the original cutoff', async t => {
  const { db, binding } = await sqliteD1();
  const projectDb = new PGlite();
  try {
    for(const file of ['0005_hub_session_revocations.sql','0006_project_session_revocation_delivery.sql'])
      db.exec(await readFile('migrations/'+file,'utf8'));
    await projectDb.exec(`
      CREATE TABLE worlds_auth_sessions(id text PRIMARY KEY,issuer text NOT NULL,subject text NOT NULL,sid text,payload jsonb NOT NULL,expires bigint NOT NULL);
      CREATE TABLE worlds_session_revocations(issuer text NOT NULL,subject text NOT NULL,revoked_through bigint NOT NULL,PRIMARY KEY(issuer,subject));
    `);
    const projectStore=new PostgresAuthStore(async (sql, values)=>(await projectDb.query<Record<string,unknown>>(sql,values)).rows,true);
    const hubStore=new D1AuthStore(binding);
    const old={issuer,sub:subject,expires:Date.now()+60_000,csrf:'fixture',authenticatedAt:now-1000};
    await hubStore.putSession('hub-old',old);
    await projectStore.putSession('project-old',old);
    await projectStore.putSession('project-fresh',{...old,authenticatedAt:now+1000});
    await projectStore.putSession('project-control',{...old,sub:'fixture-2'});
    const pair=await generateKeyPair('EdDSA',{extractable:true}),kid='fixture-signing-key';
    const jwk=JSON.stringify({kid,...await exportJWK(pair.privateKey)});
    const key=sessionEventPublicKey(JSON.stringify({kid,...await exportJWK(pair.publicKey)}))!;
    const settings={WORLDS_SESSION_EVENT_CLIENT_IDS:JSON.stringify(clients.map(c=>c.clientId)),WORLDS_SESSION_EVENT_PRIVATE_JWK:jwk};
    assert.equal(projectSessionEventConfig({...settings,WORLDS_SESSION_EVENT_CLIENT_IDS:'["foreign"]'},origin,issuer,clients,binding),undefined);
    assert.equal(projectSessionEventConfig(settings,origin,issuer,[clients[0],{...clients[1],redirects:['http://slop-urself.example/auth/callback']}],binding),undefined);
    const config=projectSessionEventConfig(settings,origin,issuer,clients,binding)!;
    assert.ok(config);
    const events: SessionRevocation[]=[];
    let activeNow=now,outage=true,delayAck=false,calls=0;
    t.mock.method(globalThis,'fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
      calls++;
      assert.equal(init?.redirect,'error');
      const audience=String(input);
      assert.ok(config.audiences.includes(audience));
      if(outage&&audience===config.audiences[1])return new Response(null,{status:503});
      return receiveSessionRevocation(new Request(audience,init),{signer:origin,audience,identityIssuer:issuer,key},async event=>{
        events.push(event);
        await projectStore.applySessionRevocation(event);
        if(delayAck&&audience===config.audiences[0]){
          delayAck=false;
          await revokeHubSessions(binding,issuer,subject,activeNow+1000,config);
        }
      },activeNow);
    });
    await revokeHubSessions(binding,issuer,subject,now,config);
    assert.equal(await hubStore.getSession('hub-old'),null);
    assert.equal(await deliverProjectRevocations(config,subject,now),false);
    assert.equal(await projectStore.getSession('project-old'),null);
    assert.ok(await projectStore.getSession('project-fresh'));
    assert.ok(await projectStore.getSession('project-control'));
    assert.equal(db.prepare('SELECT count(*) AS n FROM project_session_revocation_delivery').get()?.n,1);
    assert.equal(await deliverProjectRevocations(config,subject,now+1000),false);
    assert.equal(calls,2);

    activeNow=now+3_600_000;outage=false;
    assert.equal(await deliverProjectRevocations(config,undefined,activeNow),true);
    assert.deepEqual(events.map(event=>event.revokedThrough),[now,now]);
    assert.equal(calls,3);
    assert.equal(db.prepare('SELECT count(*) AS n FROM project_session_revocation_delivery').get()?.n,0);

    // A newer user action can replace a queued event while its network send
    // is pending. Its predecessor's acknowledgement leaves that row intact.
    delayAck=true;
    await revokeHubSessions(binding,issuer,subject,activeNow,config);
    assert.equal(await deliverProjectRevocations(config,subject,activeNow),false);
    assert.deepEqual(db.prepare('SELECT DISTINCT revoked_through FROM project_session_revocation_delivery').all().map(row=>row.revoked_through),[activeNow+1000]);
    assert.equal(await pruneProjectRevocationDeliveries(config,activeNow+sessionEventMaxDelay+1000),2);
  } finally {
    await projectDb.close();
    db.close();
  }
});
