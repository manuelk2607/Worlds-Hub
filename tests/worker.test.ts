import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
import {decodeJwt,exportJWK,generateKeyPair} from 'jose';
import {sqliteD1} from './sqlite-helper.ts';
import {cookieHeader,provider} from './helpers.ts';
import {projects} from '../src/projects.ts';
import {account,loggedOut} from '../src/pages.ts';
import {hash} from '../packages/auth/store.ts';
import {route,t,type MessageKey} from '../src/i18n/core.ts';
const {default:worker}=await import(pathToFileURL(resolve('dist/server/index.js')).href);
const origin='https://worlds-hub.maki26.workers.dev';
const request=(path:string,env:Record<string,unknown>={},options?:RequestInit)=>worker.fetch(new Request(origin+path,options),env) as Promise<Response>;
const localizedLaunchPaths={
 'music-worlds':'/en','sprachwelten':'/en','it-worlds':'/en/','slop-urself':'/',
} as const;
test('both localized landing pages and all project details are server-rendered with correct links',async()=>{for(const locale of ['de','en'] as const){const r=await request(route('home',locale)),html=await r.text();assert.equal(r.status,200);assert.match(html,new RegExp(`<html lang="${locale}"`));assert.equal((html.match(/<h1/g)??[]).length,1);const overview=html.slice(html.indexOf('<section id="welten"'),html.indexOf('<section id="idee"'));assert.equal((overview.match(/<article class="card">/g)??[]).length,4);assert.doesNotMatch(overview,/<button|data-filter|data-interests|status-count/);assert.ok(html.includes(t(locale,'meta.description')));assert.match(html,new RegExp(`hreflang="${locale}"`));for(const p of projects){assert.ok(html.includes(p.name));if(p.url){const target=new URL(locale==='en'?localizedLaunchPaths[p.id]:'/',p.url).href;assert.ok(overview.includes(`data-project-home="${p.id}" href="${target}"`));}assert.ok(html.includes(t(locale,`projects.${p.id}.description` as MessageKey)));const d=await request(route(`world:${p.id}`,locale));assert.equal(d.status,200);const detail=await d.text();assert.ok(detail.includes('<h1>'+p.name+'</h1>'));if(p.url)assert.ok(detail.includes(`data-project-home="${p.id}" href="${new URL(locale==='en'?localizedLaunchPaths[p.id]:'/',p.url).href}"`));}if(locale==='en')assert.doesNotMatch(html,/>SPRACHE<|>TECHNIK<|>KREATIVITÄT</);assert.doesNotMatch(html,/Adventskalender|token=|access_token|lorem ipsum/i);assert.match(html,/application\/ld\+json/);}});
test('temporary project unavailability is announced in both languages with all project links retained',async()=>{
 const env={PUBLIC_INDEXING:'true',PROJECTS_UNAVAILABLE:' music-worlds, it-worlds, unknown '};
 for(const locale of ['de','en'] as const){
  const home=await (await request(route('home',locale),env)).text();
  assert.equal((home.match(/<article class="card">/g)??[]).length,4);
  assert.equal((home.match(/data-i18n="project.unavailable"/g)??[]).length,2);
  assert.equal((home.match(/data-project-home=/g)??[]).length,4);
  for(const id of ['music-worlds','it-worlds','slop-urself'] as const){
   const r=await request(route(`world:${id}`,locale),env),html=await r.text();
   assert.equal(r.status,200);
   assert.match(html,/<meta name="robots" content="index,follow">/);
   if(id==='slop-urself')assert.doesNotMatch(html,/data-i18n="detail.unavailableBody"/);
   else{
    assert.ok(html.includes(t(locale,'detail.unavailableBody',{name:projects.find(project=>project.id===id)!.name})));
    assert.match(html,/class="notice"><h2><span data-i18n="project.unavailable"/);
    assert.ok(html.includes(`data-project-home="${id}"`));
   }
  }
 }
});
test('localized account links lead to project profiles and distinguish transfer status',async()=>{
 const targets={
  'music-worlds':{de:'/#profil',en:'/en#profil'},
  'sprachwelten':{de:'/auth/worlds',en:'/auth/worlds-en'},
  'it-worlds':{de:'/konto/',en:'/en/konto/'},
  'slop-urself':{de:'/auth/worlds?ui_locales=de',en:'/auth/worlds?ui_locales=en'},
 };
 const session={issuer:'https://identity.test',sub:'user',csrf:'csrf',expires:Date.now()+60_000};
 for(const locale of ['de','en'] as const){
  const guest=await request(route('account',locale));
  const guestHtml=await guest.text();
  const signedIn=account(session,true,locale,undefined,true,{'music-worlds':'confirmed','sprachwelten':'revoked'});
  const publicLinks=loggedOut(locale);
  assert.equal(guest.status,200);
  assert.match(guest.headers.get('x-robots-tag')!,/noindex/);
  assert.doesNotMatch(publicLinks,/data-project-account/);
  for(const project of projects){
   assert.ok(project.url);
   const href=new URL(targets[project.id][locale],project.url).href;
   const link=`data-project-account="${project.id}" href="${href}"`;
   assert.ok(guestHtml.includes(link));
   assert.ok(signedIn.includes(link));
   assert.ok(publicLinks.includes(`data-project-home="${project.id}" href="${new URL(locale==='en'?localizedLaunchPaths[project.id]:'/',project.url).href}"`));
  }
  assert.ok(guestHtml.includes(t(locale,'account.openProjectAccount')));
  for(const key of ['account.linkConfirmed','account.linkRevoked','account.linkUnreported'] as const){
   assert.ok(signedIn.includes(t(locale,key)));
  }
 }
});
test('unconfigured SSO fails closed with no account creation/session and honest UI',async()=>{for(const path of ['/auth/login','/auth/callback','/auth/logout','/auth/backchannel-logout']){const r=await request(path,{}, {method:'POST'});assert.equal(r.status,503);assert.equal(r.headers.get('set-cookie'),null);assert.equal(r.headers.get('cache-control'),'no-store');assert.match(r.headers.get('x-robots-tag')!,/noindex/);}const r=await request('/konto');assert.match(await r.text(),/momentan noch kein zentrales Konto/);});
test('public crawlers can read noindex on unlisted Hub pages while private preview remains closed',async()=>{
 const preview=await (await request('/robots.txt')).text();
 assert.match(preview,/Disallow: \//);
 assert.doesNotMatch(await (await request('/sitemap.xml')).text(),/<loc>/);
 assert.match((await request('/')).headers.get('x-robots-tag')!,/noindex/);

 const env={PUBLIC_INDEXING:'true',GOOGLE_SITE_VERIFICATION:'test-ownership-value'};
 const xml=await (await request('/sitemap.xml',env)).text();
 assert.equal((xml.match(/<loc>/g)??[]).length,10);
 assert.equal((xml.match(/hreflang="en"/g)??[]).length,10);

 const robots=await (await request('/robots.txt',env)).text();
 const blocked=robots.split('\n').filter(line=>line.startsWith('Disallow: ')).map(line=>line.slice(10));
 assert.deepEqual(blocked,['/auth/','/api/']);
 for(const locale of ['de','en'] as const){
  const home=await (await request(route('home',locale),env)).text();
  assert.match(home,/<meta name="robots" content="index,follow">/);
  assert.ok(home.includes(`<link rel="canonical" href="${origin+route('home',locale)}">`));
  assert.match(home,/<head>.*<meta name="google-site-verification" content="test-ownership-value">.*<\/head>/s);
  for(const id of ['account','signIn','signUp','signedOut','privacy'] as const){
   const path=route(id,locale);
   assert.ok(!blocked.some(prefix=>path.startsWith(prefix)),path);
   assert.ok(!xml.includes(`<loc>${origin+path}</loc>`),path);
   const response=await request(path,env);
   assert.equal(response.status,200,path);
   assert.match(response.headers.get('x-robots-tag')!,/noindex/,path);
   assert.equal(response.headers.get('cache-control'),'no-store',path);
   assert.match(await response.text(),/<meta name="robots" content="noindex,nofollow">/,path);
  }
 }
 for(const namespace of ['/identity/','/auth/','/api/','/admin/','/rooms/']){
  assert.ok(!xml.includes(origin+namespace),namespace);
 }
});
test('security headers and same-origin assets with no inline executable JS',async()=>{const r=await request('/');assert.equal(r.headers.get('x-frame-options'),'DENY');assert.match(r.headers.get('content-security-policy')!,/frame-ancestors 'none'/);assert.doesNotMatch(r.headers.get('content-security-policy')!,/script-src[^;]*unsafe-inline/);assert.equal(r.headers.get('referrer-policy'),'no-referrer');assert.equal((await request('/konto')).headers.get('referrer-policy'),'same-origin');assert.equal((await request('/identity/reset')).headers.get('referrer-policy'),'no-referrer');const html=await r.text();assert.doesNotMatch(html,/<script(?![^>]*src=|[^>]*type="application\/ld\+json")/);assert.match(await (await request('/styles.css')).text(),/prefers-reduced-motion/);assert.match(await (await request('/client.js')).text(),/aria-pressed/);});
test('missing routes return 404; no catch-all redirects or unexpected mutations',async()=>{assert.equal((await request('/missing')).status,404);assert.equal((await request('/?utm_source=test')).status,200);assert.equal((await request('/',{},{method:'POST'})).status,405);const r=await worker.fetch(new Request('http://example.test/old-url?x=1'),{});assert.equal(r.status,308);assert.equal(r.headers.get('location'),'https://example.test/old-url?x=1');assert.equal((await request('/auth/login',{AUTH_ENABLED:'true',SITE_ORIGIN:origin})).status,503);});

test('first visit negotiates English, explicit cookie wins, and language preference is identity-bound',async()=>{const first=await request('/',{},{headers:{'accept-language':'sv,en;q=0.9,de;q=0.5'},redirect:'manual'});assert.equal(first.status,302);assert.equal(first.headers.get('location'),'/en/');assert.match(first.headers.get('set-cookie')!,/__Host-worlds-locale=en/);const explicit=await request('/',{},{headers:{cookie:'__Host-worlds-locale=de','accept-language':'en'}});assert.equal(explicit.status,200);assert.match(await explicit.text(),/<html lang="de"/);const {db,binding}=await sqliteD1();try{db.exec(await readFile('migrations/0001_auth.sql','utf8'));db.exec(await readFile('migrations/0003_user_preferences.sql','utf8'));const raw='A'.repeat(40),issuer='https://identity.test',payload={issuer,sub:'user-a',csrf:'csrf',expires:Date.now()+60_000};db.prepare('INSERT INTO auth_sessions (id,issuer,subject,payload,expires) VALUES (?,?,?,?,?)').run(await hash(raw),issuer,'user-a',JSON.stringify(payload),payload.expires);const env={AUTH_ENABLED:'true',SITE_ORIGIN:origin,OIDC_ISSUER:issuer,OIDC_CLIENT_ID:'hub',OIDC_ID_TOKEN_ALG:'RS256',AUTH_DB:binding};const unauth=await request('/api/preferences/locale',env,{headers:{accept:'application/json'}});assert.equal(unauth.status,401);const saved=await request('/api/preferences/locale',env,{method:'POST',headers:{origin,'content-type':'application/json',cookie:'__Host-worlds-session='+raw},body:'{"locale":"en"}'});assert.equal(saved.status,200);assert.deepEqual(await saved.json(),{locale:'en'});assert.deepEqual(await (await request('/api/preferences/locale',env,{headers:{cookie:'__Host-worlds-session='+raw}})).json(),{locale:'en'});assert.equal(db.prepare('SELECT subject,locale FROM user_preferences').get()?.subject,'user-a');const hostile=await request('/api/preferences/locale',env,{method:'POST',headers:{origin:'https://evil.test','content-type':'application/json',cookie:'__Host-worlds-session='+raw},body:'{"locale":"de"}'});assert.equal(hostile.status,403);}finally{db.close();}});

test('verified central login stores locale without a separate Hub session',async t=>{
 const {db,binding}=await sqliteD1();
 t.after(()=>db.close());
 for(const file of ['0002_identity_rate_limits.sql','0003_user_preferences.sql']){
  db.exec(await readFile('migrations/'+file,'utf8'));
 }
 const issuer='https://identity.test/auth';
 const env={AUTH_ENABLED:'true',SITE_ORIGIN:origin,OIDC_ISSUER:issuer,OIDC_CLIENT_ID:'hub',
  OIDC_ID_TOKEN_ALG:'EdDSA',IDENTITY_ENABLED:'true',IDENTITY_AUTH_URL:issuer,
  IDENTITY_COOKIE_SECRET:'test-only-cookie-key-at-least-32-characters',AUTH_DB:binding};
 const cookie='__Secure-neon-auth.session_token=test-only-native-cookie';
 let userId='native-user',sessionUserId=userId,verified=true,calls=0;
 t.mock.method(globalThis,'fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
  calls++;
  const url=new URL(String(input));
  assert.equal(url.origin+url.pathname,issuer+'/get-session');
  assert.equal(url.searchParams.get('disableCookieCache'),'true');
  assert.equal(url.searchParams.get('disableRefresh'),'true');
  assert.equal(new Headers(init?.headers).get('cookie'),cookie);
  return Response.json({user:{id:userId,email:'fixture@example.test',emailVerified:verified},session:{userId:sessionUserId}});
 });
 const path='/api/preferences/locale';
 const headers={cookie,'cf-connecting-ip':'192.0.2.1'};
 const save=(requestOrigin:string)=>request(path,env,{method:'POST',headers:{...headers,origin:requestOrigin,'content-type':'application/json'},body:'{"locale":"en","subject":"other-user"}'});
 assert.equal((await request(path,env)).status,401);
 assert.equal((await save('https://other.test')).status,403);
 assert.equal((await request(path,{...env,IDENTITY_AUTH_URL:'https://other.test/auth'},{headers})).status,401);
 assert.equal(calls,0);
 verified=false;
 assert.equal((await save(origin)).status,401);
 verified=true;
 sessionUserId='different-user';
 assert.equal((await save(origin)).status,401);
 sessionUserId=userId;
 assert.deepEqual(await (await save(origin)).json(),{locale:'en'});
 assert.deepEqual(await (await request(path,env,{headers})).json(),{locale:'en'});
 userId=sessionUserId='other-user';
 assert.deepEqual(await (await request(path,env,{headers})).json(),{locale:null});
 const rows=db.prepare('SELECT issuer,subject,locale FROM user_preferences').all();
 assert.deepEqual(rows.map(row=>[row.issuer,row.subject,row.locale]),[[issuer,'native-user','en']]);

 const staleHub='A'.repeat(40), expires=Date.now()+60_000;
 const hubSession={issuer,sub:'hub-user',csrf:'fixture',expires};
 db.prepare('INSERT INTO auth_sessions (id,issuer,subject,payload,expires) VALUES (?,?,?,?,?)')
  .run(await hash(staleHub),issuer,hubSession.sub,JSON.stringify(hubSession),expires);
 db.prepare('INSERT INTO user_preferences (issuer, subject, locale, updated_at) VALUES (?,?,?,?)')
  .run(issuer,hubSession.sub,'de',Date.now());
 userId=sessionUserId='native-user';
 const hubCookie='__Host-worlds-session='+staleHub;
 const both={...headers,cookie:hubCookie+'; '+cookie};
 const identityPath=path+'?session=identity';
 assert.deepEqual(await (await request(path,env,{headers:both})).json(),{locale:'de'});
 assert.deepEqual(await (await request(identityPath,env,{headers:both})).json(),{locale:'en'});
 const change=await request(identityPath,env,{method:'POST',
  headers:{...both,origin,'content-type':'application/json'},body:'{"locale":"de"}'});
 assert.equal(change.status,200);
 assert.equal(db.prepare("SELECT locale FROM user_preferences WHERE subject='native-user'").get()?.locale,'de');
 assert.equal(db.prepare("SELECT locale FROM user_preferences WHERE subject='hub-user'").get()?.locale,'de');
 const changedHub=await request(path,env,{method:'POST',
  headers:{...both,origin,'content-type':'application/json'},body:'{"locale":"en"}'});
 assert.equal(changedHub.status,200);
 assert.deepEqual(await (await request(identityPath,env,{headers:both})).json(),{locale:'de'});
 const onlyHub={...headers,cookie:hubCookie};
 assert.equal((await request(identityPath,env,{headers:onlyHub})).status,401);
 assert.equal((await request(identityPath,env,{method:'POST',
  headers:{...onlyHub,origin,'content-type':'application/json'},body:'{"locale":"de"}'})).status,401);
 assert.deepEqual(await (await request(path,env,{headers:onlyHub})).json(),{locale:'en'});
});

test('the central account button starts the localized Hub session using the existing OIDC form',async()=>{
 const issuer='https://identity.test/auth';
 const fixed={SITE_ORIGIN:origin,IDENTITY_ENABLED:'true',IDENTITY_AUTH_URL:issuer,
  IDENTITY_COOKIE_SECRET:'test-only-cookie-key-at-least-32-characters',AUTH_DB:{} as D1Database};
 const hub={...fixed,AUTH_ENABLED:'true',OIDC_ISSUER:issuer,OIDC_CLIENT_ID:'hub',OIDC_ID_TOKEN_ALG:'EdDSA'};
 for(const locale of ['de','en'] as const){
  const identityPath='/identity/account?ui_locales='+locale;
  const identity=await (await request(identityPath,hub)).text();
  const action='/auth/login?next='+encodeURIComponent(route('account',locale))+'&amp;ui_locales='+locale;
  assert.ok(identity.includes(`action="${action}" data-auth-login`));
  assert.match(identity,/class="button identity-primary" type="submit" data-identity-verified-action disabled/);
  assert.ok(identity.includes(t(locale,'identity.toHubAccount')));
  const account=await (await request(route('account',locale),hub)).text();
  assert.ok(account.includes(`action="${action}" data-auth-login`));
  assert.doesNotMatch(await (await request(identityPath,fixed)).text(),/data-auth-login/);
 }
 const app={clientId:'app',name:'App',redirects:['https://app.test/auth/callback'],resource:'https://app.test/api'};
 const query=new URLSearchParams({client_id:app.clientId,scope:'openid profile email',redirect_uri:app.redirects[0],resource:app.resource});
 const relyingParty=await (await request('/identity/login?'+query,{...hub,IDENTITY_CLIENTS:JSON.stringify([app])})).text();
 assert.match(relyingParty,/data-identity-continue/);
 assert.doesNotMatch(relyingParty,/data-auth-login/);
});

test('a provider outage during login returns a localized and private retry response',async context=>{
 const {db,binding}=await sqliteD1();
 context.after(()=>db.close());
 db.exec(await readFile('migrations/0001_auth.sql','utf8'));
 const issuer='https://identity.test/auth';
 const env={SITE_ORIGIN:origin,AUTH_ENABLED:'true',OIDC_ISSUER:issuer,OIDC_CLIENT_ID:'hub',
  OIDC_ID_TOKEN_ALG:'EdDSA',AUTH_DB:binding};
 let discoveryRequests=0;
 context.mock.method(globalThis,'fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
  assert.equal(String(input),issuer+'/.well-known/openid-configuration');
  assert.ok(init?.signal instanceof AbortSignal);
  discoveryRequests++;
  return new Response('details from the provider', {status:502});
 });
 for(const locale of ['de','en'] as const){
  const path='/auth/login?ui_locales='+locale+'&next=https%3A%2F%2Felsewhere.test';
  for(const accept of ['text/html','application/json']){
   const response=await request(path,env,{method:'POST',headers:{origin,accept}});
   assert.equal(response.status,503);
   assert.equal(response.headers.get('cache-control'),'no-store');
   assert.match(response.headers.get('x-robots-tag')!,/noindex/);
   assert.equal(response.headers.get('set-cookie'),null);
   assert.equal(response.headers.get('location'),null);
   const body=await response.text();
   assert.doesNotMatch(body,/details from the provider|elsewhere\.test/);
   if(accept==='application/json')assert.deepEqual(JSON.parse(body),{error:'OIDC_LOGIN_UNAVAILABLE',message:t(locale,'error.authUnavailable')});
   else{
    assert.ok(body.includes(`<html lang="${locale}"`));
    assert.ok(body.includes(t(locale,'error.authUnavailableTitle')));
    assert.ok(body.includes(`href="${route('account',locale)}"`));
   }
  }
 }
 assert.equal((await request('/auth/login',env,{method:'POST',headers:{origin:'https://elsewhere.test'}})).status,403);
 assert.equal((await request('/auth/callback?code=unissued',env)).status,400);
 assert.equal(discoveryRequests,4);
 assert.equal(db.prepare('SELECT COUNT(*) AS count FROM auth_transactions').get()?.count,0);
 assert.equal(db.prepare('SELECT COUNT(*) AS count FROM auth_sessions').get()?.count,0);
});

test('an interrupted callback offers a fresh start and preserves an existing Hub session',async context=>{
 const {db,binding}=await sqliteD1();
 context.after(()=>db.close());
 db.exec(await readFile('migrations/0001_auth.sql','utf8'));
 const idp=await provider('EdDSA');
 const env={SITE_ORIGIN:origin,AUTH_ENABLED:'true',OIDC_ISSUER:idp.as.issuer,OIDC_CLIENT_ID:'hub',
  OIDC_ID_TOKEN_ALG:'EdDSA',AUTH_DB:binding};
 const existing='A'.repeat(40),sessionId=await hash(existing),expires=Date.now()+60_000;
 const session={issuer:idp.as.issuer,sub:'existing-user',csrf:'fixture',expires};
 db.prepare('INSERT INTO auth_sessions (id,issuer,subject,payload,expires) VALUES (?,?,?,?,?)')
  .run(sessionId,session.issuer,session.sub,JSON.stringify(session),expires);
 let failingEndpoint='';
 context.mock.method(globalThis,'fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
  assert.ok(init?.signal instanceof AbortSignal);
  if(new URL(String(input)).pathname===failingEndpoint){
   if(failingEndpoint==='/jwks')throw new DOMException('private failure details','TimeoutError');
   return new Response('private failure details',{status:503});
  }
  return idp.fetch(input,init);
 });
 const start=()=>request('/auth/login?next=%2Fen%2Faccount&ui_locales=en',env,{method:'POST',headers:{origin}});
 for(const endpoint of ['/token','/jwks']){
  const first=await start();
  const callbackUrl=idp.authorize(first.headers.get('location')!);
  const complete=()=>worker.fetch(new Request(callbackUrl,{headers:{cookie:`${cookieHeader(first)}; __Host-worlds-locale=en; __Host-worlds-session=${existing}`}}),env) as Promise<Response>;
  failingEndpoint=endpoint;
  const failure=await complete();
  assert.equal(failure.status,503);
  assert.equal(failure.headers.get('referrer-policy'),'no-referrer');
  assert.equal(failure.headers.get('set-cookie'),null);
  const body=await failure.text();
  assert.ok(body.includes(t('en','error.authUnavailableTitle')));
  assert.match(body,/href="\/en\/account"/);
  assert.doesNotMatch(body,/private failure details|\?code=/);
  assert.ok(db.prepare('SELECT id FROM auth_sessions WHERE id=?').get(sessionId));
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM auth_sessions').get()?.count,1);
  failingEndpoint='';
  assert.equal((await complete()).status,400);
 }
 const fresh=await start();
 const completed=await worker.fetch(new Request(idp.authorize(fresh.headers.get('location')!),{
  headers:{cookie:cookieHeader(fresh)},
 }),env) as Response;
 assert.equal(completed.status,303);
 assert.equal(completed.headers.get('location'),'/en/account');
 assert.match(completed.headers.get('set-cookie')!,/__Host-worlds-session=/);
});

test('both languages explain central login, project linkage and the identity data export',async()=>{
 const env={IDENTITY_ENABLED:'true',SITE_ORIGIN:origin,IDENTITY_AUTH_URL:'https://identity.test/auth',
  IDENTITY_COOKIE_SECRET:'test-only-cookie-key-at-least-32-characters',AUTH_DB:{} as D1Database};
 for(const locale of ['de','en'] as const){
  const home=await (await request(route('home',locale),env)).text();
  assert.ok(home.includes(t(locale,'faq.accountAnswer')));
  const signIn=await request('/identity/login?ui_locales='+locale,env);
  assert.equal(signIn.status,200);
  const identity=await signIn.text();
  assert.ok(identity.includes(t(locale,'identity.intro')));
  assert.doesNotMatch(identity,/\bpilot\b/i);
  const response=await request(route('privacy',locale),env);
  const privacy=await response.text();
  assert.match(response.headers.get('x-robots-tag')!,/noindex/);
  assert.ok(privacy.includes(t(locale,'privacy.linksBody')));
  assert.ok(privacy.includes(t(locale,'privacy.exportBody')));
  assert.ok(privacy.includes('href="'+route('account',locale)+'"><span data-i18n="account.manage"'));
 }
});

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

test('the existing production schedule calls the private IT-Worlds receipt task once daily',async t=>{
 const {db,binding}=await sqliteD1();
 t.after(()=>db.close());
 db.exec(await readFile('migrations/0002_identity_rate_limits.sql','utf8'));
 let calls=0;
 const task={async deliver(){calls++;return {acknowledged:0,conflict:0};}};
 const env={AUTH_DB:binding,AUTH_ENABLED:'true',SITE_ORIGIN:origin,OIDC_ISSUER:'https://managed.example/auth',
  OIDC_CLIENT_ID:'hub',OIDC_ID_TOKEN_ALG:'EdDSA',MIGRATION_RECEIPTS_ENABLED:'true',
  MIGRATION_RECEIPT_KEYS:JSON.stringify({'it-worlds':{kid:'fixture',kty:'OKP',crv:'Ed25519',x:'A'.repeat(43)}}),
  IT_WORLDS_MIGRATION_TASK:task};
 const selected={scheduledTime:Date.UTC(2026,10,24,3,17)};
 await worker.scheduled({},env);
 await worker.scheduled({scheduledTime:Date.UTC(2026,10,24,2,17)},env);
 await worker.scheduled(selected,{...env,SITE_ORIGIN:'https://test.example'});
 await worker.scheduled(selected,{...env,MIGRATION_RECEIPTS_ENABLED:'false'});
 await worker.scheduled(selected,{...env,MIGRATION_RECEIPT_KEYS:undefined});
 await worker.scheduled(selected,{...env,IT_WORLDS_MIGRATION_TASK:undefined});
 assert.equal(calls,0);
 await worker.scheduled(selected,env);
 assert.equal(calls,1);
});

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
