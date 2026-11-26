import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
const raw=process.argv[2]??'https://worlds-hub.maki26.workers.dev';
const origin=new URL(raw).origin;
if(!raw.startsWith('https://')&&!['localhost','127.0.0.1'].includes(new URL(raw).hostname))throw new Error('HTTPS required');
const publicPaths=['/','/welten/music-worlds','/welten/sprachwelten','/welten/it-worlds','/welten/slop-urself','/en/','/en/worlds/music-worlds','/en/worlds/sprachwelten','/en/worlds/it-worlds','/en/worlds/slop-urself'];
const paths=[...publicPaths,'/konto','/en/account','/robots.txt','/sitemap.xml','/styles.css','/client.js'];
for(const path of paths){
  const read=()=>fetch(origin+path,{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(15000)});
  let response=await read();
  let body=await response.text();
  if(path==='/robots.txt'){
    // The previous Worker may still serve this public file just after an upload.
    for(let attempt=0;attempt<4&&response.ok&&body.includes('Disallow: /konto\n');attempt++){
      await delay(3000);
      response=await read();
      body=await response.text();
    }
  }
  assert.equal(response.status,200,`${path}: HTTP ${response.status}`);
  if(publicPaths.includes(path)){
    assert.ok(body.includes(`rel="canonical" href="${origin+path}"`),`${path}: canonical`);
    assert.match(body,/<title[^>]*>[^<]+<\/title>/);assert.match(body,/<meta name="description" content="[^"]+"/);
    assert.match(body,/<meta name="robots" content="index,follow">/);
    assert.match(body,/property="og:title"/);assert.equal(response.headers.get('x-robots-tag'),null);
  }
  if(path==='/'){
    for(const url of ['https://music-worlds.maki26.workers.dev/','https://sprachwelten.maki26.workers.dev/','https://it-worlds.maki26.workers.dev/','https://slopurself.maki26.workers.dev/'])assert.ok(body.includes('href="'+url+'"'));
    assert.match(body,/href="\/welten\/music-worlds"/);assert.match(body,/application\/ld\+json/);
    assert.match(response.headers.get('content-security-policy')!,/frame-ancestors 'none'/);
  }
  if(path==='/en/'){
    const targets={
      'music-worlds':'https://music-worlds.maki26.workers.dev/en',
      sprachwelten:'https://sprachwelten.maki26.workers.dev/en',
      'it-worlds':'https://it-worlds.maki26.workers.dev/en/',
      'slop-urself':'https://slopurself.maki26.workers.dev/',
    };
    for(const [id,url] of Object.entries(targets))assert.ok(body.includes(`data-project-home="${id}" href="${url}"`),id);
  }
  if(path==='/konto'||path==='/en/account'){assert.match(response.headers.get('x-robots-tag')!,/noindex/);assert.equal(response.headers.get('cache-control'),'no-store');assert.match(body,path.startsWith('/en/')?/Sign in to Worlds/:/Bei Worlds anmelden/);assert.equal(response.headers.get('referrer-policy'),'same-origin');}
  if(path==='/robots.txt'){
    assert.match(body,/Allow: \//);
    assert.deepEqual(body.split('\n').filter(line=>line.startsWith('Disallow:')),['Disallow: /auth/','Disallow: /api/']);
    assert.ok(body.includes(origin+'/sitemap.xml'));
  }
  if(path==='/sitemap.xml'){assert.equal((body.match(/<loc>/g)??[]).length,10);assert.equal((body.match(/hreflang="en"/g)??[]).length,10);assert.doesNotMatch(body,/\/(konto|account|auth|admin|rooms)(\/|<)/);assert.ok(body.includes(origin));}
  console.log('PASS '+path);
}
const missing=await fetch(origin+'/definitely-not-a-page',{redirect:'manual'});assert.equal(missing.status,404);
const auth=await fetch(origin+'/auth/login?next=%2Fen%2Faccount&ui_locales=en',{method:'POST',headers:{origin},redirect:'manual'});assert.equal(auth.status,303);assert.match(auth.headers.get('x-robots-tag')!,/noindex/);const target=new URL(auth.headers.get('location')!);assert.equal(target.origin,'https://ep-bold-boat-batl101c.neonauth.c-8.eu-central-1.aws.neon.tech');assert.equal(target.searchParams.get('code_challenge_method'),'S256');assert.equal(target.searchParams.get('redirect_uri'),origin+'/auth/callback');assert.equal(target.searchParams.get('ui_locales'),'en');assert.match(auth.headers.get('set-cookie')!,/HttpOnly/);const invalidCallback=await fetch(origin+'/auth/callback?code=not-issued&state=not-issued');assert.equal(invalidCallback.status,400);
for(const path of ['/identity/login?ui_locales=en','/api/identity/get-session']){const response=await fetch(origin+path,{redirect:'manual'});assert.equal(response.status,200);assert.match(response.headers.get('x-robots-tag')!,/noindex/);assert.equal(response.headers.get('cache-control'),'no-store');const body=await response.text();if(path.endsWith('get-session'))assert.deepEqual(JSON.parse(body),{user:null,session:null});else{assert.match(body,/worlds-identity-csrf/);assert.match(body,/<html lang="en"/);}}
const jsonStart=await fetch(origin+'/auth/login',{method:'POST',headers:{origin,accept:'application/json'},redirect:'manual'});assert.equal(jsonStart.status,200);assert.equal(new URL((await jsonStart.json() as {url:string}).url).searchParams.get('code_challenge_method'),'S256');assert.match(jsonStart.headers.get('set-cookie')!,/HttpOnly/);
const identityMutation=await fetch(origin+'/api/identity/sign-out',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{}',redirect:'manual'});assert.equal(identityMutation.status,403);
const expectPilot=process.env.EXPECT_DEVICE_SIGN_OUT_PILOT==='true';
const expectProduction=process.env.EXPECT_DEVICE_SIGN_OUT_PRODUCTION==='true';
let accountCsrfCookie='';
for(const language of ['de','en']){
 const settings=await fetch(origin+'/identity/account?ui_locales='+language,{redirect:'manual'});
 assert.equal(settings.status,200);
 assert.match(settings.headers.get('x-robots-tag')!,/noindex/);
 assert.equal(settings.headers.get('cache-control'),'no-store');
 const body=await settings.text();
 assert.ok(body.includes('<html lang="'+language+'"'));
 assert.match(body,/data-identity-form="change-password"/);
 assert.equal(body.includes('data-i18n="identity.passwordChangeWorldsNote"'),expectProduction);
 assert.match(body,/data-identity-export/);
 if(expectPilot||expectProduction){
  assert.match(body,expectPilot?/data-identity-device-sign-out="pilot"[^>]+hidden/:/data-identity-device-sign-out="projects"[^>]+disabled/);
  accountCsrfCookie=settings.headers.getSetCookie().find(value=>value.startsWith('__Host-worlds-identity-csrf='))?.split(';')[0]??'';
  assert.ok(accountCsrfCookie);
 }else assert.doesNotMatch(body,/data-identity-device-sign-out/);
}
for(const language of ['de','en']){
 const response=await fetch(origin+'/identity/reset?ui_locales='+language,{redirect:'manual'});
 assert.equal(response.status,200);
 assert.match(response.headers.get('x-robots-tag')!,/noindex/);
 assert.equal(response.headers.get('cache-control'),'no-store');
 const body=await response.text();
 assert.ok(body.includes('<html lang="'+language+'"'));
 if(expectProduction)assert.match(body,/data-reset-sign-out-option hidden><input type="checkbox" data-reset-sign-out-choice>/);
 else assert.doesNotMatch(body,/data-reset-sign-out-choice/);
}
const deviceSignOut=await fetch(origin+'/api/identity/revoke-sessions',{
 method:'POST',headers:{origin,'content-type':'application/json',...(accountCsrfCookie?{
  cookie:accountCsrfCookie,'x-worlds-identity-csrf':accountCsrfCookie.split('=')[1],
 }:{})},body:'{}',
});
assert.equal(deviceSignOut.status,expectPilot||expectProduction?401:404);
if(expectProduction){
 const passwordChange=await fetch(origin+'/api/identity/change-password',{
  method:'POST',headers:{origin,'content-type':'application/json',cookie:accountCsrfCookie,
   'x-worlds-identity-csrf':accountCsrfCookie.split('=')[1]},
  body:JSON.stringify({currentPassword:'anonymous-fixture',newPassword:'anonymous-fixture-new'}),
 });
 assert.equal(passwordChange.status,401);
 assert.deepEqual(await passwordChange.json(),{error:'SIGN_IN_REQUIRED'});
}
for(const path of ['change-password','export']){
 const response=await fetch(origin+'/api/identity/'+path,{method:'POST',headers:{origin,'content-type':'application/json'},body:'{}'});
 assert.equal(response.status,403);
 assert.equal(response.headers.get('cache-control'),'no-store');
}
console.log('PASS 404, Hub OIDC start, live identity pilot and CSRF. HTTPS, public SEO, private headers and navigation verified.');
