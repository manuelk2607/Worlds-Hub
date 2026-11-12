import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {decodeJwt,exportJWK,generateKeyPair} from 'jose';
import {identityConfig,identityCsrf,authorizationClient,identityProxy,limitIdentity,type IdentityConfig} from '../src/identity.ts';
import {identityPage} from '../src/identity-pages.ts';
import {sqliteD1} from './sqlite-helper.ts';
import {D1AuthStore} from '../packages/auth/store.ts';
const origin='https://worlds-hub.maki26.workers.dev',baseUrl='https://central.neonauth.test/worlds/auth';
const client={clientId:'hub-pilot',name:'Worlds Hub',redirects:[origin+'/auth/callback'],resource:origin+'/api'};
const rawQuery=new URLSearchParams({client_id:client.clientId,redirect_uri:client.redirects[0],scope:'openid profile email',resource:client.resource,response_type:'code',state:'test-state',nonce:'test-nonce',code_challenge_method:'S256',code_challenge:'test-challenge'}).toString()+'&sig=signed%2Bquery%3D&exp=9999999999';
async function fixture(){const {db,binding}=await sqliteD1();db.exec(await readFile('migrations/0002_identity_rate_limits.sql','utf8'));const config:IdentityConfig={origin,baseUrl,cookieSecret:'test-only-cookie-key-at-least-32-characters',clients:[client],db:binding};const csrf=identityCsrf(new Request(origin));const headers={origin,'content-type':'application/json','cf-connecting-ip':'192.0.2.1','x-worlds-identity-csrf':csrf.value,cookie:csrf.setCookie.split(';')[0]+'; __Secure-neon-auth.session_token=test-only-neon-cookie; __Host-worlds-session=private-rp-cookie'};return {db,binding,config,csrf,headers,request:(path:string,body:unknown={},extra:Record<string,string>={})=>new Request(origin+'/api/identity/'+path,{method:'POST',headers:{...headers,...extra},body:JSON.stringify(body)})};}
test('identity configuration remains fail-closed until full isolated setup',async()=>{const f=await fixture();try{assert.equal(identityConfig({}),null);const env={IDENTITY_ENABLED:'true',SITE_ORIGIN:origin,IDENTITY_AUTH_URL:baseUrl,IDENTITY_COOKIE_SECRET:f.config.cookieSecret,IDENTITY_CLIENTS:JSON.stringify([client]),AUTH_DB:f.binding};assert.ok(identityConfig(env));assert.equal(identityConfig({...env,AUTH_DB:undefined}),null);assert.equal(identityConfig({...env,IDENTITY_COOKIE_SECRET:'short'}),null);assert.equal(identityConfig({...env,IDENTITY_CLIENTS:JSON.stringify([{...client,redirects:['https://evil.test/callback#fragment']}])}),null);}finally{f.db.close();}});
test('only configured client, exact redirect, minimal scopes and resource reach consent UI',async()=>{const f=await fixture();try{assert.equal(authorizationClient(rawQuery,f.config)?.clientId,client.clientId);for(const [key,value] of [['client_id','attacker'],['redirect_uri','https://evil.test/callback'],['scope','openid admin'],['resource','https://other.test/api']]){const q=new URLSearchParams(rawQuery);q.set(key,value);assert.equal(authorizationClient(q.toString(),f.config),null);}assert.equal(authorizationClient(rawQuery+'&client_id=duplicate',f.config),null);const page=identityPage('/identity/consent',rawQuery,f.csrf.value,f.config);assert.equal(page.status,200);assert.match(page.body,/worlds-hub.maki26.workers.dev/);assert.match(page.body,/Ablehnen/);assert.equal(identityPage('/identity/login','client_id=attacker',f.csrf.value,f.config).status,400);}finally{f.db.close();}});
test('identity mutations require Origin, JSON and browser-bound CSRF; admin APIs absent',async t=>{const f=await fixture();let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json({});});try{assert.equal((await identityProxy(f.request('sign-in/email',{}, {origin:'https://evil.test'}),f.config)).status,403);assert.equal((await identityProxy(f.request('sign-in/email',{}, {'x-worlds-identity-csrf':'wrong'}),f.config)).status,403);assert.equal((await identityProxy(f.request('sign-in/email',{}, {'content-type':'text/plain'}),f.config)).status,415);assert.equal((await identityProxy(f.request('admin/create-user'),f.config)).status,404);assert.equal((await identityProxy(f.request('oauth2/consent',{accept:true}),f.config)).status,400);assert.equal(calls,0);}finally{f.db.close();}});
test('managed SDK proxy preserves signed oauth_query and strips credentials from responses',async t=>{const f=await fixture();let seenBody:Record<string,unknown>={},seenCookie='';t.mock.method(globalThis,'fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{assert.equal(String(input),baseUrl+'/sign-in/email');seenBody=JSON.parse(String(init?.body));seenCookie=new Headers(init?.headers).get('cookie')??'';return Response.json({token:'private-provider-token',user:{id:'central-1',name:'Ada',email:'ada@example.test',emailVerified:true},url:origin+'/identity/consent?'+rawQuery},{headers:{'set-auth-token':'private-provider-token','set-auth-jwt':'private-provider-jwt','set-cookie':'__Secure-neon-auth.test=opaque; Path=/; HttpOnly; Secure; SameSite=None; Partitioned'}});});try{const response=await identityProxy(f.request('sign-in/email',{email:'ada@example.test',password:'test-only-long-password',oauth_query:rawQuery,callbackURL:'https://evil.test',role:'admin'}),f.config);assert.equal(response.status,200);assert.equal(seenBody.oauth_query,rawQuery);assert.equal(seenBody.callbackURL,undefined);assert.equal(seenBody.role,undefined);assert.doesNotMatch(seenCookie,/private-rp-cookie|worlds-identity-csrf/);assert.match(seenCookie,/neon-auth.session_token/);const body=await response.text();assert.doesNotMatch(body,/private-provider-token|private-provider-jwt/);assert.equal(response.headers.get('set-auth-token'),null);assert.match(response.headers.get('set-cookie')!,/Secure/);assert.match(response.headers.get('set-cookie')!,/SameSite=Lax/i);assert.doesNotMatch(response.headers.get('set-cookie')!,/Partitioned/i);}finally{f.db.close();}});
test('signup cannot set roles, verified status or arbitrary callbacks',async t=>{const f=await fixture();let seen:Record<string,unknown>={};t.mock.method(globalThis,'fetch',async(_input:RequestInfo|URL,init?:RequestInit)=>{seen=JSON.parse(String(init?.body));return Response.json({user:{id:'central-1',name:'Ada',email:'ada@example.test',emailVerified:false}});});try{await identityProxy(f.request('sign-up/email',{email:'ada@example.test',password:'test-only-long-password',name:'Ada',emailVerified:true,role:'admin',callbackURL:'https://evil.test'}),f.config);assert.equal(seen.emailVerified,undefined);assert.equal(seen.role,undefined);assert.equal(seen.callbackURL,origin+'/identity/account');}finally{f.db.close();}});
test('anonymous SDK session responses are safe; provider cannot inject an external redirect',async t=>{const f=await fixture();t.mock.method(globalThis,'fetch',async(input:RequestInfo|URL)=>String(input).includes('get-session')?Response.json(null):Response.json({url:'https://evil.test/steal?code=secret'}));try{const anonymous=await identityProxy(new Request(origin+'/api/identity/get-session',{headers:f.headers}),f.config);assert.deepEqual(await anonymous.json(),{user:null,session:null});assert.equal((await identityProxy(f.request('oauth2/continue',{selected:true,oauth_query:rawQuery}),f.config)).status,502);}finally{f.db.close();}});

test('the session proxy exposes the creation time needed for reauthentication without exposing its token',async t=>{
 const f=await fixture(),createdAt=new Date(Date.now()-600_000).toISOString();
 t.mock.method(globalThis,'fetch',async()=>Response.json({user:{id:'fixture',emailVerified:true},
  session:{createdAt,expiresAt:'2026-12-01T00:00:00Z',token:'private-session-token'}}));
 try{
  const response=await identityProxy(new Request(origin+'/api/identity/get-session',{headers:f.headers}),f.config);
  const data=await response.json() as {session:unknown};
  assert.deepEqual(data.session,{createdAt,expiresAt:'2026-12-01T00:00:00Z'});
  assert.doesNotMatch(JSON.stringify(data),/private-session-token/);
 }finally{f.db.close();}
});
test('D1 rate buckets are atomic, bounded and contain no raw IP or credentials',async()=>{const f=await fixture();try{const outcomes=await Promise.all(Array.from({length:16},()=>limitIdentity(f.request('sign-in/email'),'sign-in/email',f.config,1_000_000)));assert.equal(outcomes.filter(Boolean).length,12);const rows=f.db.prepare('SELECT * FROM identity_rate_limits').all();assert.equal(rows.length,1);assert.doesNotMatch(JSON.stringify(rows),/192\.0\.2|test-only-cookie/);assert.match(String(rows[0].id),/^[0-9a-f]{64}$/);const continuations=await Promise.all(Array.from({length:61},()=>limitIdentity(f.request('oauth2/continue'),'oauth2/continue',f.config,1_000_000)));assert.equal(continuations.filter(Boolean).length,60);}finally{f.db.close();}});

const fixtureUser={id:'central-1',email:'ada@example.test',name:'Ada',emailVerified:true};
const providerSession=()=>Response.json({user:fixtureUser,session:{userId:fixtureUser.id,token:'provider-session-secret'}});

test('signing out all devices uses only the verified account and fences in-flight Hub callbacks',async t=>{
 const f=await fixture();
 f.db.exec(await readFile('migrations/0005_hub_session_revocations.sql','utf8'));
 const config={...f.config,deviceSignOutEnabled:true};
 const store=new D1AuthStore(f.binding),expires=Date.now()+60_000;
 const value={issuer:baseUrl,sub:fixtureUser.id,expires,csrf:'fixture',authenticatedAt:Date.now()-60_000};
 await store.putSession('self',value);
 await store.putSession('another-device',value);
 await store.putSession('other',{...value,sub:'another-user'});
 await store.putSession('foreign',{...value,issuer:'https://other.test'});
 let identity: 'signed-out'|'mismatched'|'verified'='signed-out',providerCalls=0,confirmed=false;
 t.mock.method(globalThis,'fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=new URL(String(input));
  providerCalls++;
  if(url.pathname.endsWith('/get-session')){
   assert.equal(url.searchParams.get('disableCookieCache'),'true');
   assert.equal(url.searchParams.get('disableRefresh'),'true');
   if(identity==='signed-out')return Response.json(null);
   if(identity==='mismatched')return Response.json({user:fixtureUser,session:{userId:'another-user'}});
   return providerSession();
  }
  assert.equal(String(input),baseUrl+'/revoke-sessions');
  assert.deepEqual(JSON.parse(String(init?.body)),{});
  assert.equal(await store.getSession('self'),null);
  assert.equal(await store.getSession('another-device'),null);
  await assert.rejects(store.putSession('late-old-callback',value),/predates sign-out/);
  return confirmed?Response.json({status:true,token:'do-not-expose'}):Response.json({status:false},{status:503});
 });
 try{
  const request=(extra:Record<string,string>={})=>f.request('revoke-sessions',{userId:'another-user',allAccounts:true},extra);
  assert.equal((await identityProxy(request(),f.config)).status,404);
  assert.equal((await identityProxy(request({origin:'https://other.test'}),config)).status,403);
  assert.equal((await identityProxy(request({'x-worlds-identity-csrf':'wrong'}),config)).status,403);
  assert.equal(providerCalls,0);
  assert.equal((await identityProxy(request(),config)).status,401);
  identity='mismatched';
  assert.equal((await identityProxy(request(),config)).status,401);
  assert.ok(await store.getSession('self'));
  identity='verified';
  const partial=await identityProxy(request(),config);
  assert.deepEqual(await partial.json(),{error:'DEVICE_SIGN_OUT_PARTIAL'});
  assert.equal(partial.headers.get('set-cookie'),null);
  assert.ok(await store.getSession('other'));
  assert.ok(await store.getSession('foreign'));
  confirmed=true;
  const response=await identityProxy(request(),config);
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{success:true});
  for(const name of ['__Host-worlds-session','__Secure-neon-auth.session_token','__Secure-neon-auth.local.session_data']){
   assert.ok(response.headers.getSetCookie().some(cookie=>cookie.startsWith(name+'=;')&&cookie.includes('Max-Age=0')));
  }
  const fence=f.db.prepare('SELECT revoked_at FROM hub_session_revocations WHERE issuer=? AND subject=?')
   .get(baseUrl,fixtureUser.id)?.revoked_at;
  assert.equal(typeof fence,'number');
  await assert.rejects(store.putSession('late-missing-auth-time',{...value,authenticatedAt:undefined}),/predates sign-out/);
  await assert.rejects(store.putSession('late-same-second',{...value,authenticatedAt:Number(fence)}),/predates sign-out/);
  await store.putSession('fresh',{...value,authenticatedAt:Number(fence)+1000});
  assert.ok(await store.getSession('fresh'));
  assert.ok(await store.getSession('other'));
  assert.ok(await store.getSession('foreign'));
 }finally{f.db.close();}
});

test('device sign-out appears in both languages only for enabled account settings',async()=>{
 const f=await fixture();
 try{
  for(const locale of ['de','en'] as const){
   assert.doesNotMatch(identityPage('/identity/account','',f.csrf.value,f.config,locale).body,/data-identity-device-sign-out/);
   const enabled={...f.config,deviceSignOutEnabled:true};
   const page=identityPage('/identity/account','',f.csrf.value,enabled,locale).body;
   assert.match(page,/data-identity-device-sign-out/);
   assert.match(page,locale==='de'?/Auf allen Geräten bei Worlds Hub abmelden/:/Sign out of Worlds Hub on all devices/);
   assert.doesNotMatch(identityPage('/identity/login','',f.csrf.value,enabled,locale).body,/data-identity-device-sign-out/);
  }
 }finally{f.db.close();}
});

test('the expiring sign-out pilot authorizes only the verified test subject and sends only to the test worlds',async t=>{
 const f=await fixture();
 try{
  for(const name of ['0005_hub_session_revocations','0006_project_session_revocation_delivery']){
   f.db.exec(await readFile('migrations/'+name+'.sql','utf8'));
  }
  const targets=['https://sprachwelten-worlds-pilot.maki26.workers.dev','https://slopurself-worlds-pilot.maki26.workers.dev'];
  const testClients=targets.map((target,i)=>({clientId:'test-'+i,name:'Test world',redirects:[target+'/auth/callback'],resource:target+'/api'}));
  const production={...testClients[0],redirects:['https://sprachwelten.maki26.workers.dev/auth/callback'],resource:'https://sprachwelten.maki26.workers.dev/api'};
  const {privateKey}=await generateKeyPair('EdDSA',{extractable:true});
  const pilot={subject:fixtureUser.id,expiresAt:Date.now()+60_000};
  const env={IDENTITY_ENABLED:'true',SITE_ORIGIN:origin,IDENTITY_AUTH_URL:baseUrl,IDENTITY_COOKIE_SECRET:f.config.cookieSecret,
   IDENTITY_CLIENTS:JSON.stringify([client,production,...testClients]),AUTH_DB:f.binding,IDENTITY_DEVICE_SIGN_OUT_ENABLED:'pilot',
   IDENTITY_DEVICE_SIGN_OUT_PILOT:JSON.stringify(pilot),WORLDS_SESSION_EVENT_PRIVATE_JWK:JSON.stringify({kid:'test-signing',...await exportJWK(privateKey)}),
   WORLDS_SESSION_EVENT_CLIENT_IDS:JSON.stringify([production.clientId])};
  const audiences=targets.map(target=>target+'/auth/events/session-revoked');
  const config=identityConfig(env)!;
  assert.deepEqual(config.deviceSignOutPilot,pilot);
  assert.deepEqual(config.projectSessionEvents?.audiences,audiences);
  for(const invalid of [
   {...env,IDENTITY_DEVICE_SIGN_OUT_PILOT:undefined},
   {...env,IDENTITY_DEVICE_SIGN_OUT_PILOT:JSON.stringify({...pilot,expiresAt:Date.now()-1})},
   {...env,IDENTITY_CLIENTS:JSON.stringify([client,production,testClients[0]])},
   {...env,WORLDS_SESSION_EVENT_PRIVATE_JWK:undefined},
  ]){
   assert.equal(identityConfig(invalid)?.deviceSignOutEnabled,false);
  }
  for(const language of ['de','en'] as const){
   const html=identityPage('/identity/account','',f.csrf.value,config,language).body;
   assert.match(html,/data-identity-device-sign-out="pilot"[^>]+hidden/);
   assert.doesNotMatch(html,new RegExp(pilot.subject));
  }
  const store=new D1AuthStore(f.binding);
  const session={issuer:baseUrl,sub:pilot.subject,expires:Date.now()+60_000,csrf:'fixture'};
  await store.putSession('pilot',session);
  await store.putSession('other',{...session,sub:'another-account'});
  let userId='another-account',sessionOwner=userId,providerRevocations=0;
  const deliveries:string[]=[];
  t.mock.method(globalThis,'fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
   const target=new URL(String(input));
   if(target.pathname.endsWith('/get-session')){
    return Response.json({user:{...fixtureUser,id:userId},session:{userId:sessionOwner,token:'private-session'}});
   }
   if(target.href===baseUrl+'/revoke-sessions'){
    assert.deepEqual(JSON.parse(String(init?.body)),{});
    providerRevocations++;
    return Response.json({status:true});
   }
   assert.ok(audiences.includes(target.href));
   const event=decodeJwt(String(init?.body));
   assert.deepEqual(event.sub_id,{format:'iss_sub',iss:baseUrl,sub:pilot.subject});
   assert.equal(event.aud,target.href);
   deliveries.push(target.href);
   return new Response(null,{status:202});
  });
  const current=async()=>{
   const response=await identityProxy(new Request(origin+'/api/identity/get-session',{headers:f.headers}),config);
   return response.json() as Promise<{deviceSignOutAllowed?:boolean;session:{token?:string}}>;
  };
  const action=()=>f.request('revoke-sessions',{userId:pilot.subject});
  assert.equal((await current()).deviceSignOutAllowed,undefined);
  assert.equal((await identityProxy(action(),config)).status,404);
  assert.ok(await store.getSession('pilot'));
  assert.equal(providerRevocations,0);
  userId=pilot.subject;
  assert.equal((await current()).deviceSignOutAllowed,undefined);
  assert.equal((await identityProxy(action(),config)).status,401);
  sessionOwner=pilot.subject;
  const capability=await current();
  assert.equal(capability.deviceSignOutAllowed,true);
  assert.equal(capability.session.token,undefined);
  const expired={...config,deviceSignOutPilot:{...pilot,expiresAt:Date.now()-1}};
  assert.equal((await identityProxy(action(),expired)).status,404);
  const signedOut=await identityProxy(f.request('revoke-sessions',{userId:'another-account'}),config);
  assert.deepEqual(await signedOut.json(),{success:true,projectSessionsEnded:true});
  assert.equal(providerRevocations,1);
  assert.deepEqual(deliveries.sort(),audiences.sort());
  assert.equal(await store.getSession('pilot'),null);
  assert.ok(await store.getSession('other'));
 }finally{f.db.close();}
});

test('password change rechecks the central session, forces provider revocation and removes only this identity’s Hub sessions',async t=>{
 const f=await fixture();
 f.db.exec(await readFile('migrations/0001_auth.sql','utf8'));
 const store=new D1AuthStore(f.binding),expires=Date.now()+60_000;
 const session={issuer:baseUrl,sub:fixtureUser.id,expires,csrf:'fixture'};
 await store.putSession('self',session);
 await store.putSession('other',{...session,sub:'other-user'});
 await store.putSession('foreign',{...session,issuer:'https://other.test'});
 const received:Record<string,unknown>[]=[];
 let accepted=false;
 t.mock.method(globalThis,'fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=new URL(String(input));
  if(url.pathname.endsWith('/get-session')){
   assert.equal(url.searchParams.get('disableCookieCache'),'true');
   return providerSession();
  }
  assert.equal(String(input),baseUrl+'/change-password');
  received.push(JSON.parse(String(init?.body)));
  return accepted?Response.json({user:fixtureUser,token:'provider-token-secret'}):
   Response.json({code:'INVALID_PASSWORD',message:'credential detail should not leave the provider'},{status:400});
 });
 try{
  const body={currentPassword:'old-only-fixture',newPassword:'new-only-fixture',revokeOtherSessions:false,userId:'other-user'};
  assert.equal((await identityProxy(f.request('change-password',body,{origin:'https://other.test'}),f.config)).status,403);
  assert.equal((await identityProxy(f.request('change-password',{...body,newPassword:'short'}),f.config)).status,400);
  const refused=await identityProxy(f.request('change-password',body),f.config);
  assert.deepEqual(await refused.json(),{error:'INVALID_PASSWORD'});
  assert.ok(await store.getSession('self'));
  accepted=true;
  const changed=await identityProxy(f.request('change-password',body),f.config);
  assert.deepEqual(await changed.json(),{success:true,hubSessionsRevoked:true});
  assert.deepEqual(received,Array(2).fill({currentPassword:'old-only-fixture',newPassword:'new-only-fixture',revokeOtherSessions:true}));
  assert.equal(await store.getSession('self'),null);
  assert.ok(await store.getSession('other'));
  assert.ok(await store.getSession('foreign'));
 }finally{f.db.close();}
});

test('identity export contains only the authenticated profile, preference and migration states',async t=>{
 const f=await fixture();
 f.db.exec(await readFile('migrations/0003_user_preferences.sql','utf8'));
 f.db.exec(await readFile('migrations/0004_migration_receipts.sql','utf8'));
 const insert=f.db.prepare('INSERT INTO user_preferences VALUES (?,?,?,?)');
 insert.run(baseUrl,fixtureUser.id,'en',1);
 insert.run(baseUrl,'other-user','de',1);
 const receipt=f.db.prepare('INSERT INTO migration_receipts VALUES (?,?,?,?,?,?,?)');
 receipt.run('slop-urself',baseUrl,fixtureUser.id,'a'.repeat(64),1,'confirmed',1);
 receipt.run('it-worlds',baseUrl,'other-user','b'.repeat(64),1,'revoked',1);
 const migration={origin,identityIssuer:baseUrl,db:f.binding,keys:{}};
 let signedIn=false;
 t.mock.method(globalThis,'fetch',async(input:RequestInfo|URL)=>{
  assert.ok(new URL(String(input)).pathname.endsWith('/get-session'));
  return signedIn?providerSession():Response.json(null);
 });
 try{
  assert.equal((await identityProxy(f.request('export',{}, {'x-worlds-identity-csrf':'wrong'}),f.config)).status,403);
  assert.equal((await identityProxy(f.request('export'),f.config)).status,401);
  signedIn=true;
  const response=await identityProxy(f.request('export',{userId:'other-user'}),f.config,migration);
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-disposition')!,/attachment/);
  const data=await response.json() as {identity:unknown;preferences:unknown;migrations:unknown;exportedAt:string};
  assert.deepEqual(data.identity,{issuer:baseUrl,...fixtureUser});
  assert.deepEqual(data.preferences,{locale:'en'});
  assert.deepEqual(data.migrations,{'slop-urself':'confirmed'});
  assert.ok(Number.isFinite(Date.parse(data.exportedAt)));
  assert.doesNotMatch(JSON.stringify(data),/provider-session-secret|other-user|a{64}|account_ref|revision/);
 }finally{f.db.close();}
});

test('password limits reject oversized credentials before the provider and keep existing short logins usable',async t=>{
 const f=await fixture(),received:Record<string,unknown>[]=[];
 t.mock.method(globalThis,'fetch',async(_input:RequestInfo|URL,init?:RequestInit)=>{
  received.push(JSON.parse(String(init?.body)));
  return Response.json({});
 });
 try{
  const long='x'.repeat(129),valid='x'.repeat(12);
  for(const [path,body] of [
   ['sign-in/email',{email:'ada@example.test',password:long}],
   ['sign-up/email',{email:'ada@example.test',name:'Ada',password:long}],
   ['reset-password',{token:'fixture',newPassword:long}],
   ['change-password',{currentPassword:long,newPassword:valid}],
   ['change-password',{currentPassword:valid,newPassword:long}]
  ] as const){
   const response=await identityProxy(f.request(path,body),f.config);
   assert.equal(response.status,400);
   assert.deepEqual(await response.json(),{error:'PASSWORD_TOO_LONG'});
  }
  for(const [path,body] of [
   ['sign-up/email',{email:'ada@example.test',name:'Ada',password:'x'.repeat(11)}],
   ['reset-password',{token:'fixture',newPassword:'x'.repeat(11)}],
   ['change-password',{currentPassword:valid,newPassword:'x'.repeat(11)}]
  ] as const){
   const response=await identityProxy(f.request(path,body),f.config);
   assert.equal(response.status,400);
   assert.deepEqual(await response.json(),{error:'PASSWORD_TOO_SHORT'});
  }
  assert.equal(received.length,0,'Rejected passwords must not use provider requests or change sessions.');
  const exact=' '+'x'.repeat(126)+' ';
  for(const password of ['old-1234',exact]){
   const response=await identityProxy(f.request('sign-in/email',{email:'ada@example.test',password}),f.config);
   assert.equal(response.status,200);
   assert.equal(received.at(-1)?.password,password,'The full password must be forwarded without trimming or truncation.');
  }
 }finally{f.db.close();}
});
