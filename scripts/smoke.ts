import assert from 'node:assert/strict';
const raw=process.argv[2]??'https://worlds-hub.maki26.workers.dev';
const origin=new URL(raw).origin;
if(!raw.startsWith('https://')&&!['localhost','127.0.0.1'].includes(new URL(raw).hostname))throw new Error('HTTPS required');
const paths=['/','/welten/music-worlds','/welten/sprachwelten','/welten/it-worlds','/welten/slop-urself','/konto','/robots.txt','/sitemap.xml','/styles.css','/client.js'];
for(const path of paths){
  const response=await fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,200,`${path}: HTTP ${response.status}`);
  const body=await response.text();
  if(path==='/'||path.startsWith('/welten/')){
    assert.ok(body.includes(`rel="canonical" href="${origin+path}"`),`${path}: canonical`);
    assert.match(body,/<title>[^<]+<\/title>/);assert.match(body,/<meta name="description" content="[^"]+">/);
    assert.match(body,/<meta name="robots" content="index,follow">/);
    assert.match(body,/property="og:title"/);assert.equal(response.headers.get('x-robots-tag'),null);
  }
  if(path==='/'){
    for(const url of ['https://music-worlds.maki26.workers.dev/','https://sprachwelten.maki26.workers.dev/','https://it-worlds.maki26.workers.dev/','https://slopurself.maki26.workers.dev/'])assert.ok(body.includes('href="'+url+'"'));
    assert.match(body,/href="\/welten\/music-worlds"/);assert.match(body,/application\/ld\+json/);
    assert.match(response.headers.get('content-security-policy')!,/frame-ancestors 'none'/);
  }
  if(path==='/konto'){assert.match(response.headers.get('x-robots-tag')!,/noindex/);assert.equal(response.headers.get('cache-control'),'no-store');assert.match(body,/Bei Worlds anmelden/);assert.equal(response.headers.get('referrer-policy'),'same-origin');}
  if(path==='/robots.txt'){assert.match(body,/Allow: \//);assert.match(body,/Disallow: \/auth\//);assert.ok(body.includes(origin+'/sitemap.xml'));}
  if(path==='/sitemap.xml'){assert.equal((body.match(/<loc>/g)??[]).length,5);assert.doesNotMatch(body,/\/(konto|auth|admin|rooms)(\/|<)/);assert.ok(body.includes(origin));}
  console.log('PASS '+path);
}
const missing=await fetch(origin+'/definitely-not-a-page',{redirect:'manual'});assert.equal(missing.status,404);
const auth=await fetch(origin+'/auth/login',{method:'POST',headers:{origin},redirect:'manual'});assert.equal(auth.status,303);assert.match(auth.headers.get('x-robots-tag')!,/noindex/);const target=new URL(auth.headers.get('location')!);assert.equal(target.origin,'https://ep-bold-boat-batl101c.neonauth.c-8.eu-central-1.aws.neon.tech');assert.equal(target.searchParams.get('code_challenge_method'),'S256');assert.equal(target.searchParams.get('redirect_uri'),origin+'/auth/callback');assert.match(auth.headers.get('set-cookie')!,/HttpOnly/);const invalidCallback=await fetch(origin+'/auth/callback?code=not-issued&state=not-issued');assert.equal(invalidCallback.status,400);
for(const path of ['/identity/login','/api/identity/get-session']){const response=await fetch(origin+path,{redirect:'manual'});assert.equal(response.status,200);assert.match(response.headers.get('x-robots-tag')!,/noindex/);assert.equal(response.headers.get('cache-control'),'no-store');const body=await response.text();if(path.endsWith('get-session'))assert.deepEqual(JSON.parse(body),{user:null,session:null});else assert.match(body,/worlds-identity-csrf/);}
const jsonStart=await fetch(origin+'/auth/login',{method:'POST',headers:{origin,accept:'application/json'},redirect:'manual'});assert.equal(jsonStart.status,200);assert.equal(new URL((await jsonStart.json() as {url:string}).url).searchParams.get('code_challenge_method'),'S256');assert.match(jsonStart.headers.get('set-cookie')!,/HttpOnly/);
const identityMutation=await fetch(origin+'/api/identity/sign-out',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{}',redirect:'manual'});assert.equal(identityMutation.status,403);
console.log('PASS 404, Hub OIDC start, live identity pilot and CSRF. HTTPS, public SEO, private headers and navigation verified.');
