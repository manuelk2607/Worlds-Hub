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
  deliverProjectRevocations, productionSessionServices, projectSessionEventConfig, pruneProjectRevocationDeliveries,
} from '../src/project-session-events.ts';
import {identityConfig, type IdentityEnv} from '../src/identity.ts';
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
      assert.equal(init?.redirect,'manual');
      const audience=String(input);
      assert.ok(config.audiences.includes(audience));
      if(outage&&audience===config.audiences[1])return Response.redirect('https://unexpected.example',307);
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
    assert.equal(await pruneProjectRevocationDeliveries(binding,activeNow+sessionEventMaxDelay+1000),2);
  } finally {
    await projectDb.close();
    db.close();
  }
});

test('global sign-out opens only with all four exact production receivers and delivers over their bindings', async t => {
  const { db, binding } = await sqliteD1();
  try {
    for(const file of ['0005_hub_session_revocations.sql','0006_project_session_revocation_delivery.sql'])
      db.exec(await readFile('migrations/'+file,'utf8'));
    const producer='https://worlds-hub.maki26.workers.dev';
    const expectedOrigins=productionSessionServices.map(({service})=>`https://${service}.maki26.workers.dev`);
    const registered=expectedOrigins.map((target,i)=>({
      clientId:`production-${i}`,name:`World ${i}`,redirects:[target+'/auth/callback'],resource:target+'/api',
    }));
    const pilot={clientId:'pilot',name:'Pilot',redirects:['https://slopurself-worlds-pilot.maki26.workers.dev/auth/callback'],resource:'https://slopurself-worlds-pilot.maki26.workers.dev/api'};
    const pair=await generateKeyPair('EdDSA',{extractable:true}),kid='production-fixture';
    const key=sessionEventPublicKey(JSON.stringify({kid,...await exportJWK(pair.publicKey)}))!;
    const rawKey=JSON.stringify({kid,...await exportJWK(pair.privateKey)});
    const received: string[]=[];
    let concurrent=0,peak=0;
    const settings: IdentityEnv={SITE_ORIGIN:producer,IDENTITY_ENABLED:'true',IDENTITY_AUTH_URL:issuer,
      IDENTITY_COOKIE_SECRET:'synthetic-cookie-secret-long-enough',AUTH_DB:binding,
      IDENTITY_DEVICE_SIGN_OUT_ENABLED:'true',WORLDS_SESSION_EVENT_PRIVATE_JWK:rawKey,
      IDENTITY_CLIENTS:JSON.stringify([...registered,pilot]),
      WORLDS_SESSION_EVENT_CLIENT_IDS:JSON.stringify([pilot.clientId])};
    const outgoing=t.mock.method(globalThis,'fetch',async()=>new Response(null,{status:500}));
    for(const [i,{binding:variable}] of productionSessionServices.entries()){
      const audience=expectedOrigins[i]+'/auth/events/session-revoked';
      settings[variable]={fetch:async(input,init)=>{
        assert.equal(input,audience);
        assert.equal(init?.redirect,'manual');
        concurrent++;
        peak=Math.max(peak,concurrent);
        try{
          return await receiveSessionRevocation(new Request(input,init),{signer:producer,audience,identityIssuer:issuer,key},async event=>{
            assert.ok([subject,'other-fixture'].includes(event.subject));
            received.push(audience);
          },now);
        }finally{concurrent--;}
      }};
    }
    const firstBinding=productionSessionServices[0].binding;
    for(const invalid of [
      {...settings,[firstBinding]:undefined},
      {...settings,WORLDS_SESSION_EVENT_PRIVATE_JWK:undefined},
      {...settings,SITE_ORIGIN:'https://preview.example'},
      {...settings,IDENTITY_CLIENTS:JSON.stringify(registered.slice(1))},
      {...settings,IDENTITY_CLIENTS:JSON.stringify([...registered,{...registered[0],clientId:'duplicate'}])},
      {...settings,IDENTITY_DEVICE_SIGN_OUT_ENABLED:'false'},
    ]){
      const config=identityConfig(invalid);
      assert.equal(config?.deviceSignOutEnabled,false);
      assert.equal(config?.projectSessionEvents,undefined);
    }
    const selected=identityConfig(settings);
    assert.equal(selected?.deviceSignOutEnabled,true);
    assert.ok(selected.projectSessionEvents);
    await revokeHubSessions(binding,issuer,subject,now,selected.projectSessionEvents);
    assert.equal(await deliverProjectRevocations(selected.projectSessionEvents,subject,now),true);
    assert.deepEqual(received.sort(),expectedOrigins.map(target=>target+'/auth/events/session-revoked').sort());
    await revokeHubSessions(binding,issuer,subject,now,selected.projectSessionEvents);
    await revokeHubSessions(binding,issuer,'other-fixture',now,selected.projectSessionEvents);
    assert.equal(await deliverProjectRevocations(selected.projectSessionEvents,undefined,now),true);
    assert.equal(received.length,12);
    assert.equal(peak,4);
    assert.equal(outgoing.mock.callCount(),0);
    assert.deepEqual(db.prepare('SELECT 1 FROM project_session_revocation_delivery').all(),[]);
  } finally {
    db.close();
  }
});
