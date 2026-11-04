import { identityConfig,identityProxy,identityCsrf,type IdentityEnv } from './identity.ts';
import { identityPage } from './identity-pages.ts';
import { css,identityCss } from './styles.ts';
import { layout,home,detail,account,loggedOut,privacy } from './pages.ts';
import { projects,escapeHtml } from './projects.ts';
import { D1AuthStore } from '../packages/auth/store.ts';
import { session,startLogin,callback,logout,backchannelLogout,type AuthConfig } from '../packages/auth/oidc.ts';
// Build injects the compiled browser script as a string; no runtime filesystem access.
import clientScript from './client.ts?raw';
export interface Env extends IdentityEnv { SITE_ORIGIN?:string; PUBLIC_INDEXING?:string; GOOGLE_SITE_VERIFICATION?:string; AUTH_ENABLED?:string; OIDC_ISSUER?:string; OIDC_CLIENT_ID?:string; OIDC_CLIENT_SECRET?:string; OIDC_RESOURCE?:string; OIDC_REAUTH_ENABLED?:string; OIDC_TOKEN_AUTH_METHOD?:'client_secret_basic'|'client_secret_post'; OIDC_ID_TOKEN_ALG?:string; OIDC_ACCOUNT_URL?:string; AUTH_DB?:D1Database }
export const DEFAULT_ORIGIN='https://worlds-hub.maki26.workers.dev';
export function authConfig(env:Env):AuthConfig|null {
  if(env.AUTH_ENABLED!=='true'||!env.SITE_ORIGIN||!env.OIDC_ISSUER||!env.OIDC_CLIENT_ID||!env.AUTH_DB||!env.OIDC_ID_TOKEN_ALG)return null;
  if(!['RS256','ES256','EdDSA'].includes(env.OIDC_ID_TOKEN_ALG))return null;
  try {const origin=new URL(env.SITE_ORIGIN),issuer=new URL(env.OIDC_ISSUER);if(origin.protocol!=='https:'||origin.origin!==env.SITE_ORIGIN||issuer.protocol!=='https:'||issuer.search||issuer.hash||issuer.username||issuer.password)return null;
  return {origin:origin.origin,issuer:env.OIDC_ISSUER,clientId:env.OIDC_CLIENT_ID,clientSecret:env.OIDC_CLIENT_SECRET,reauthEnabled:env.OIDC_REAUTH_ENABLED==='true',resource:env.OIDC_RESOURCE,tokenAuthMethod:env.OIDC_TOKEN_AUTH_METHOD,algorithm:env.OIDC_ID_TOKEN_ALG,store:new D1AuthStore(env.AUTH_DB)};}catch{return null;}
}
function secure(response:Response,privatePage:boolean) {
  const headers=new Headers(response.headers);
  headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','no-referrer');headers.set('X-Frame-Options','DENY');
  // Inline styles support SVG artwork/page accents; scripts use same-origin external files.
  headers.set('Content-Security-Policy',"default-src 'none'; script-src 'self' 'sha256-PLACEHOLDER'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'");
  headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');headers.set('Strict-Transport-Security','max-age=31536000');
  if(privatePage){headers.set('Cache-Control','no-store');headers.set('X-Robots-Tag','noindex, nofollow');}else headers.set('Cache-Control','public, max-age=0, must-revalidate');
  return new Response(response.body,{status:response.status,headers});
}
const text=(body:string,type:string,status=200)=>new Response(body,{status,headers:{'Content-Type':type+'; charset=utf-8'}});
export default {
  async fetch(request:Request,env:Env={}):Promise<Response> {
    const url=new URL(request.url),path=url.pathname,origin=env.SITE_ORIGIN??DEFAULT_ORIGIN;
    const isPrivate=!['/','/styles.css','/client.js','/favicon.svg','/robots.txt','/sitemap.xml',...projects.map(p=>'/welten/'+p.id)].includes(path);
    const finish=(r:Response)=>secure(r,isPrivate);
    if(url.protocol==='http:'&&!['localhost','127.0.0.1'].includes(url.hostname))return finish(new Response(null,{status:308,headers:{location:'https://'+url.host+url.pathname+url.search}}));
    if(path==='/styles.css'&&request.method==='GET')return finish(text(css+identityCss,'text/css'));
    if(path==='/client.js'&&request.method==='GET')return finish(text(clientScript,'text/javascript'));
    if(path==='/favicon.svg'&&request.method==='GET')return finish(text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#f7f7f2"/><rect x="8" y="8" width="10" height="10" rx="3" fill="#ac95d2"/><rect x="22" y="8" width="10" height="10" rx="3" fill="#dba677"/><rect x="8" y="22" width="10" height="10" rx="3" fill="#8faec3"/><rect x="22" y="22" width="10" height="10" rx="3" fill="#9fb681"/></svg>','image/svg+xml'));
    if(path==='/robots.txt'&&request.method==='GET')return finish(text(env.PUBLIC_INDEXING==='true'?`User-agent: *\nAllow: /\nDisallow: /konto\nDisallow: /anmelden\nDisallow: /registrieren\nDisallow: /auth/\nDisallow: /api/\nDisallow: /identity/\nDisallow: /abgemeldet\nDisallow: /datenschutz\nSitemap: ${origin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n','text/plain'));
    if(path==='/sitemap.xml'&&request.method==='GET')return finish(text(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${env.PUBLIC_INDEXING==='true'?['/',...projects.map(p=>'/welten/'+p.id)].map(p=>`<url><loc>${escapeHtml(origin+p)}</loc></url>`).join(''):''}</urlset>`,'application/xml'));
    const central=identityConfig(env);
    if(path.startsWith('/api/identity/'))return finish(central?await identityProxy(request,central):Response.json({error:'IDENTITY_NOT_CONFIGURED'},{status:503}));
    if(path.startsWith('/identity/')){
      if(!central)return finish(text('Die zentrale Identität wird noch vorbereitet.','text/plain',503));
      if(!['/identity/login','/identity/consent','/identity/account','/identity/reset'].includes(path))return finish(text('Seite nicht gefunden.','text/plain',404));
      if(url.origin!==central.origin)return finish(text('Unzulässiger Host.','text/plain',421));
      if(request.method!=='GET')return finish(text('Methode nicht erlaubt.','text/plain',405));
      const csrf=identityCsrf(request),page=identityPage(path,url.search.slice(1),csrf.value,central);
      const response=finish(text(layout(page.body,{origin:central.origin,path,title:page.title,description:'Zentrale Worlds-Identität im abgesicherten Pilotbetrieb.',indexing:false}),'text/html',page.status));
      response.headers.append('set-cookie',csrf.setCookie);return response;
    }
    const config=authConfig(env);
    // Never accept forwarded host headers or use the request host as an OAuth redirect origin.
    if((path.startsWith('/auth/')||path.startsWith('/api/')||path==='/konto')&&config&&url.origin!==config.origin)return finish(text('Unzulässiger Host.','text/plain',421));
    if(path.startsWith('/auth/')) {
      if(!config)return finish(Response.json({error:'SSO_NOT_CONFIGURED',message:'Die zentrale Anmeldung ist noch nicht eingerichtet.'},{status:503}));
      try {
        if(path==='/auth/login')return finish(await startLogin(request,config));
        if(path==='/auth/callback')return finish(await callback(request,config));
        if(path==='/auth/logout')return finish(await logout(request,config));
        if(path==='/auth/backchannel-logout')return finish(await backchannelLogout(request,config));
      }catch{return finish(text('Die Anmeldung konnte nicht abgeschlossen werden. Bitte starte sie erneut im Kontobereich.','text/plain',400));}
    }
    if(request.method!=='GET'&&request.method!=='HEAD')return finish(text('Methode nicht erlaubt.','text/plain',405));
    let body:string,title='Worlds Hub – Musik, Sprachen, IT & Kreativität entdecken',description='Entdecke Music-Worlds, Sprachwelten, IT-Worlds und Slop Urself. Dein zentraler Einstieg in vier eigenständige Welten.',status=200,schema:unknown;
    if(path==='/'){body=home();schema={'@context':'https://schema.org','@type':'WebSite',name:'Worlds Hub',url:origin+'/',description,hasPart:projects.filter(p=>p.url).map(p=>({'@type':'WebSite',name:p.name,url:p.url}))};}
    else if(path==='/konto'||path==='/anmelden'||path==='/registrieren') {
      let current: Awaited<ReturnType<typeof session>>;
      try{current=config?await session(request,config):null;}catch{return finish(text('Der Kontodienst ist vorübergehend nicht erreichbar.','text/plain',503));}
      let accountUrl: string|undefined;
      if(env.OIDC_ACCOUNT_URL) {const u=new URL(env.OIDC_ACCOUNT_URL);if(u.protocol==='https:'&&!u.username&&!u.password)accountUrl=u.href;}
      body=account(current,!!config,accountUrl);title='Dein Konto | Worlds Hub';description='Bestehende Konten nutzen und den Stand der zentralen Worlds-Anmeldung ansehen.';
    }else if(path==='/abgemeldet'){body=loggedOut;title='Abgemeldet | Worlds Hub';}
    else if(path==='/datenschutz'){body=privacy;title='Datenschutz | Worlds Hub';}
    else {const project=projects.find(p=>path==='/welten/'+p.id);if(project){body=detail(project);title=project.name+' – '+project.eyebrow+' | Worlds Hub';description=project.description;}else{status=404;title='Seite nicht gefunden | Worlds Hub';body='<div class="wrap content-page"><h1>Hier ist noch<br>keine Welt.</h1><p>Diese Seite wurde nicht gefunden.</p><a class="button" href="/">Zur Startseite →</a></div>';}}
    const html=layout(body,{origin,path,title,description,indexing:env.PUBLIC_INDEXING==='true'&&!isPrivate&&status===200,verification:env.GOOGLE_SITE_VERIFICATION,schema});
    const response=finish(text(request.method==='HEAD'?'':html,'text/html',status));
    if(env.PUBLIC_INDEXING!=='true')response.headers.set('X-Robots-Tag','noindex, nofollow');
    return response;
  },
  async scheduled(_event:unknown,env:Env) {if(env.AUTH_DB)await env.AUTH_DB.batch(['auth_transactions','auth_sessions','auth_replays','identity_rate_limits'].map(t=>env.AUTH_DB!.prepare(`DELETE FROM ${t} WHERE id IN (SELECT id FROM ${t} WHERE expires < ? ORDER BY expires LIMIT 500)`).bind(Date.now())));}
};
