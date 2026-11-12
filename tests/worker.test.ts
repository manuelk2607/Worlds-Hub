import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
import {decodeJwt,exportJWK,generateKeyPair} from 'jose';
import {sqliteD1} from './sqlite-helper.ts';
import {projects} from '../src/projects.ts';
import {hash} from '../packages/auth/store.ts';
import {route,t,type MessageKey} from '../src/i18n/core.ts';
const {default:worker}=await import(pathToFileURL(resolve('dist/server/index.js')).href);
const origin='https://worlds-hub.maki26.workers.dev';
const request=(path:string,env:Record<string,unknown>={},options?:RequestInit)=>worker.fetch(new Request(origin+path,options),env) as Promise<Response>;
test('both localized landing pages and all project details are server-rendered with correct links',async()=>{for(const locale of ['de','en'] as const){const r=await request(route('home',locale)),html=await r.text();assert.equal(r.status,200);assert.match(html,new RegExp(`<html lang="${locale}"`));assert.equal((html.match(/<h1/g)??[]).length,1);assert.ok(html.includes(t(locale,'meta.description')));assert.match(html,new RegExp(`hreflang="${locale}"`));for(const p of projects){assert.ok(html.includes(p.name));if(p.url)assert.ok(html.includes('href="'+p.url+'"'));assert.ok(html.includes(t(locale,`projects.${p.id}.description` as MessageKey)));const d=await request(route(`world:${p.id}`,locale));assert.equal(d.status,200);assert.ok((await d.text()).includes('<h1>'+p.name+'</h1>'));}if(locale==='en')assert.doesNotMatch(html,/>SPRACHE<|>TECHNIK<|>KREATIVITÄT</);assert.doesNotMatch(html,/Adventskalender|token=|access_token|lorem ipsum/i);assert.match(html,/application\/ld\+json/);}});
test('unconfigured SSO fails closed with no account creation/session and honest UI',async()=>{for(const path of ['/auth/login','/auth/callback','/auth/logout','/auth/backchannel-logout']){const r=await request(path,{}, {method:'POST'});assert.equal(r.status,503);assert.equal(r.headers.get('set-cookie'),null);assert.equal(r.headers.get('cache-control'),'no-store');assert.match(r.headers.get('x-robots-tag')!,/noindex/);}const r=await request('/konto');assert.match(await r.text(),/momentan noch kein zentrales Konto/);});
test('private preview is never indexed; public mode includes ten reciprocal localized pages',async()=>{const privateRobots=await (await request('/robots.txt')).text();assert.match(privateRobots,/Disallow: \//);assert.doesNotMatch(await (await request('/sitemap.xml')).text(),/<loc>/);assert.match((await request('/')).headers.get('x-robots-tag')!,/noindex/);const env={PUBLIC_INDEXING:'true'};const xml=await (await request('/sitemap.xml',env)).text();assert.equal((xml.match(/<loc>/g)??[]).length,10);assert.equal((xml.match(/hreflang="en"/g)??[]).length,10);assert.doesNotMatch(xml,/\/(konto|account|auth|admin|chat|rooms)(\/|<)/);const robots=await (await request('/robots.txt',env)).text();assert.match(robots,/Disallow: \/auth\//);assert.match(robots,/Disallow: \/en\/account/);for(const locale of ['de','en'] as const){const home=await (await request(route('home',locale),env)).text();assert.match(home,/<meta name="robots" content="index,follow">/);assert.match(home,new RegExp('<link rel="canonical" href="'+(origin+route('home',locale)).replaceAll('.','\\.')+'">'));}assert.match((await request('/konto',env)).headers.get('x-robots-tag')!,/noindex/);});
test('security headers and same-origin assets with no inline executable JS',async()=>{const r=await request('/');assert.equal(r.headers.get('x-frame-options'),'DENY');assert.match(r.headers.get('content-security-policy')!,/frame-ancestors 'none'/);assert.doesNotMatch(r.headers.get('content-security-policy')!,/script-src[^;]*unsafe-inline/);assert.equal(r.headers.get('referrer-policy'),'no-referrer');assert.equal((await request('/konto')).headers.get('referrer-policy'),'same-origin');assert.equal((await request('/identity/reset')).headers.get('referrer-policy'),'no-referrer');const html=await r.text();assert.doesNotMatch(html,/<script(?![^>]*src=|[^>]*type="application\/ld\+json")/);assert.match(await (await request('/styles.css')).text(),/prefers-reduced-motion/);assert.match(await (await request('/client.js')).text(),/aria-pressed/);});
test('missing routes return 404; no catch-all redirects or unexpected mutations',async()=>{assert.equal((await request('/missing')).status,404);assert.equal((await request('/?utm_source=test')).status,200);assert.equal((await request('/',{},{method:'POST'})).status,405);const r=await worker.fetch(new Request('http://example.test/old-url?x=1'),{});assert.equal(r.status,308);assert.equal(r.headers.get('location'),'https://example.test/old-url?x=1');assert.equal((await request('/auth/login',{AUTH_ENABLED:'true',SITE_ORIGIN:origin})).status,503);});

test('first visit negotiates English, explicit cookie wins, and language preference is identity-bound',async()=>{const first=await request('/',{},{headers:{'accept-language':'sv,en;q=0.9,de;q=0.5'},redirect:'manual'});assert.equal(first.status,302);assert.equal(first.headers.get('location'),'/en/');assert.match(first.headers.get('set-cookie')!,/__Host-worlds-locale=en/);const explicit=await request('/',{},{headers:{cookie:'__Host-worlds-locale=de','accept-language':'en'}});assert.equal(explicit.status,200);assert.match(await explicit.text(),/<html lang="de"/);const {db,binding}=await sqliteD1();try{db.exec(await readFile('migrations/0001_auth.sql','utf8'));db.exec(await readFile('migrations/0003_user_preferences.sql','utf8'));const raw='A'.repeat(40),issuer='https://identity.test',payload={issuer,sub:'user-a',csrf:'csrf',expires:Date.now()+60_000};db.prepare('INSERT INTO auth_sessions (id,issuer,subject,payload,expires) VALUES (?,?,?,?,?)').run(await hash(raw),issuer,'user-a',JSON.stringify(payload),payload.expires);const env={AUTH_ENABLED:'true',SITE_ORIGIN:origin,OIDC_ISSUER:issuer,OIDC_CLIENT_ID:'hub',OIDC_ID_TOKEN_ALG:'RS256',AUTH_DB:binding};const unauth=await request('/api/preferences/locale',env,{headers:{accept:'application/json'}});assert.equal(unauth.status,401);const saved=await request('/api/preferences/locale',env,{method:'POST',headers:{origin,'content-type':'application/json',cookie:'__Host-worlds-session='+raw},body:'{"locale":"en"}'});assert.equal(saved.status,200);assert.deepEqual(await saved.json(),{locale:'en'});assert.deepEqual(await (await request('/api/preferences/locale',env,{headers:{cookie:'__Host-worlds-session='+raw}})).json(),{locale:'en'});assert.equal(db.prepare('SELECT subject,locale FROM user_preferences').get()?.subject,'user-a');const hostile=await request('/api/preferences/locale',env,{method:'POST',headers:{origin:'https://evil.test','content-type':'application/json',cookie:'__Host-worlds-session='+raw},body:'{"locale":"de"}'});assert.equal(hostile.status,403);}finally{db.close();}});

test('device locale initializes a missing profile preference without overwriting an existing one',async()=>{
 const {db,binding}=await sqliteD1();
 try{
  db.exec(await readFile('migrations/0003_user_preferences.sql','utf8'));
  const raw='A'.repeat(40),issuer='https://identity.test';
  const payload={issuer,sub:'user-a',csrf:'csrf',expires:Date.now()+60_000};
  db.prepare('INSERT INTO auth_sessions (id,issuer,subject,payload,expires) VALUES (?,?,?,?,?)')
   .run(await hash(raw),issuer,payload.sub,JSON.stringify(payload),payload.expires);
  const env={AUTH_ENABLED:'true',SITE_ORIGIN:origin,OIDC_ISSUER:issuer,OIDC_CLIENT_ID:'hub',OIDC_ID_TOKEN_ALG:'RS256',AUTH_DB:binding};
  const headers={origin,'content-type':'application/json',cookie:'__Host-worlds-session='+raw};
  const save=(body:unknown)=>request('/api/preferences/locale',env,{method:'POST',headers,body:JSON.stringify(body)});
  assert.equal((await save(null)).status,400);
  assert.equal((await save({locale:'en',initial:'yes'})).status,400);
  assert.deepEqual(await (await save({locale:'en',initial:true})).json(),{locale:'en'});
  assert.deepEqual(await (await save({locale:'de',initial:true})).json(),{locale:'en'});
  assert.deepEqual(await (await save({locale:'de'})).json(),{locale:'de'});
  assert.deepEqual(await (await save({locale:'en',initial:true})).json(),{locale:'de'});
 }finally{db.close();}
});

test('scheduled auth cleanup bounds D1 writes and preserves valid sessions',async()=>{const {db,binding}=await sqliteD1();try{db.exec(await readFile('migrations/0002_identity_rate_limits.sql','utf8'));const now=Date.now();const insert=db.prepare('INSERT INTO auth_transactions (id,payload,expires) VALUES (?,?,?)');for(let i=0;i<501;i++)insert.run('old-'+i,'{}',now-1000);insert.run('valid','{}',now+60000);await worker.scheduled({}, {AUTH_DB:binding});assert.equal(db.prepare('SELECT count(*) AS count FROM auth_transactions WHERE expires < ?').get(now)?.count,1);assert.ok(db.prepare('SELECT id FROM auth_transactions WHERE id = ?').get('valid'));}finally{db.close();}});

test('scheduled pilot deliveries stay within the authorized account, test audiences and expiry',async t=>{
 const {db,binding}=await sqliteD1();
 try{
  for(const name of ['0002_identity_rate_limits','0005_hub_session_revocations','0006_project_session_revocation_delivery']){
   db.exec(await readFile('migrations/'+name+'.sql','utf8'));
  }
  const issuer='https://issuer.test/auth',subject='pilot-fixture',now=Date.now();
  const targets=['https://sprachwelten-worlds-pilot.maki26.workers.dev','https://slopurself-worlds-pilot.maki26.workers.dev'];
  const clients=[...targets,'https://sprachwelten.maki26.workers.dev'].map((target,i)=>({
   clientId:'client-'+i,name:'World',redirects:[target+'/auth/callback'],resource:target+'/api',
  }));
  const endpoint=(target:string)=>target+'/auth/events/session-revoked';
  const {privateKey}=await generateKeyPair('EdDSA',{extractable:true});
  const pilot={subject,expiresAt:now+60_000};
  const sent:string[]=[];
  const recipient=(target:string)=>({async fetch(input:RequestInfo|URL,init?:RequestInit){
   assert.equal(String(input),endpoint(target));
   assert.equal(init?.redirect,'manual');
   sent.push(String(input));
   assert.deepEqual(decodeJwt(String(init?.body)).sub_id,{format:'iss_sub',iss:issuer,sub:subject});
   return new Response(null,{status:202});
  }});
  const env={AUTH_DB:binding,SITE_ORIGIN:origin,AUTH_ENABLED:'true',OIDC_ISSUER:issuer,OIDC_CLIENT_ID:'hub',
   OIDC_ID_TOKEN_ALG:'EdDSA',IDENTITY_ENABLED:'true',IDENTITY_AUTH_URL:issuer,IDENTITY_COOKIE_SECRET:'test-only-cookie-secret-of-32-characters',
   IDENTITY_CLIENTS:JSON.stringify(clients),IDENTITY_DEVICE_SIGN_OUT_ENABLED:'pilot',
   IDENTITY_DEVICE_SIGN_OUT_PILOT:JSON.stringify(pilot),WORLDS_SESSION_EVENT_PRIVATE_JWK:JSON.stringify({kid:'fixture',...await exportJWK(privateKey)}),
   SPRACHWELTEN_SESSION_EVENTS:recipient(targets[0]),SLOP_URSELF_SESSION_EVENTS:recipient(targets[1])};
  const insert=db.prepare('INSERT INTO project_session_revocation_delivery VALUES (?,?,?,?,?,?,?)');
  for(const [recipient,owner,id] of [
   [targets[0],subject,'eligible-language'],[targets[1],subject,'eligible-slop'],[targets[1],'different-account','foreign-account'],
   ['https://sprachwelten.maki26.workers.dev',subject,'foreign-recipient'],
  ]){
   insert.run(endpoint(recipient),issuer,owner,id,now-1000,now+60_000,now-1000);
  }
  const publicFetch=t.mock.method(globalThis,'fetch',async()=>new Response(null,{status:500}));
  await worker.scheduled({}, {...env,IDENTITY_DEVICE_SIGN_OUT_PILOT:JSON.stringify({...pilot,expiresAt:now-1})});
  assert.equal(sent.length,0);
  await worker.scheduled({},env);
  assert.deepEqual(sent.sort(),targets.map(endpoint).sort());
  assert.equal(publicFetch.mock.callCount(),0);
  assert.deepEqual(db.prepare('SELECT event_id FROM project_session_revocation_delivery ORDER BY event_id').all().map(row=>row.event_id),
   ['foreign-account','foreign-recipient']);
 }finally{db.close();}
});
