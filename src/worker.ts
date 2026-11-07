import {identityConfig,identityProxy,identityCsrf,type IdentityEnv} from './identity.ts';
import {identityPage} from './identity-pages.ts';
import {css,identityCss} from './styles.ts';
import {layout,home,detail,account,loggedOut,privacy,notFound} from './pages.ts';
import {projects} from './projects.ts';
import {escapeHtml} from './html.ts';
import {migrationConfig, readMigrationStatus, receiveMigrationReceipt, type MigrationEnv} from './migration-receipts.ts';
import {D1AuthStore} from '../packages/auth/store.ts';
import {backchannelLogout,boundedBody,callback,logout,sameOrigin,session,startLogin,type AuthConfig} from '../packages/auth/oidc.ts';
import {browserLocale,cookieLocale,languageCookie,locales,matchRoute,publicRouteIds,requestLocale,route,t,type Locale,type MessageKey,type RouteId,type Values} from './i18n/core.ts';
// Build injects the compiled browser script as a string; no runtime filesystem access.
import clientScript from './client.ts?raw';

export interface Env extends IdentityEnv,MigrationEnv {SITE_ORIGIN?:string;PUBLIC_INDEXING?:string;GOOGLE_SITE_VERIFICATION?:string;AUTH_ENABLED?:string;OIDC_ISSUER?:string;OIDC_CLIENT_ID?:string;OIDC_CLIENT_SECRET?:string;OIDC_RESOURCE?:string;OIDC_REAUTH_ENABLED?:string;OIDC_TOKEN_AUTH_METHOD?:'client_secret_basic'|'client_secret_post';OIDC_ID_TOKEN_ALG?:string;OIDC_ACCOUNT_URL?:string;AUTH_DB?:D1Database}
export const DEFAULT_ORIGIN='https://worlds-hub.maki26.workers.dev';
export function authConfig(env:Env):AuthConfig|null {
 if(env.AUTH_ENABLED!=='true'||!env.SITE_ORIGIN||!env.OIDC_ISSUER||!env.OIDC_CLIENT_ID||!env.AUTH_DB||!env.OIDC_ID_TOKEN_ALG)return null;
 if(!['RS256','ES256','EdDSA'].includes(env.OIDC_ID_TOKEN_ALG))return null;
 try{const origin=new URL(env.SITE_ORIGIN),issuer=new URL(env.OIDC_ISSUER);if(origin.protocol!=='https:'||origin.origin!==env.SITE_ORIGIN||issuer.protocol!=='https:'||issuer.search||issuer.hash||issuer.username||issuer.password)return null;
  return {origin:origin.origin,issuer:env.OIDC_ISSUER,clientId:env.OIDC_CLIENT_ID,clientSecret:env.OIDC_CLIENT_SECRET,reauthEnabled:env.OIDC_REAUTH_ENABLED==='true',resource:env.OIDC_RESOURCE,tokenAuthMethod:env.OIDC_TOKEN_AUTH_METHOD,algorithm:env.OIDC_ID_TOKEN_ALG,store:new D1AuthStore(env.AUTH_DB),returnPaths:['/','/konto','/en/','/en/account'],signedOutPaths:{de:'/abgemeldet',en:'/en/signed-out'}};
 }catch{return null;}
}
function secure(response:Response,privatePage:boolean,nonce:string,varyLanguage:boolean){
 const headers=new Headers(response.headers);
 headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','no-referrer');headers.set('X-Frame-Options','DENY');
 headers.set('Content-Security-Policy',`default-src 'none'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'`);
 headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');headers.set('Strict-Transport-Security','max-age=31536000');
 if(varyLanguage)headers.append('Vary','Cookie, Accept-Language');
 if(privatePage){headers.set('Cache-Control','no-store');headers.set('X-Robots-Tag','noindex, nofollow');}else headers.set('Cache-Control','public, max-age=0, must-revalidate');
 return new Response(response.body,{status:response.status,headers});
}
const text=(body:string,type:string,status=200)=>new Response(body,{status,headers:{'Content-Type':type+'; charset=utf-8'}});
const redirect=(location:string,cookie?:string)=>new Response(null,{status:302,headers:{location,...(cookie?{'set-cookie':cookie}:{})}});
const pageLocale=(request:Request,match:ReturnType<typeof matchRoute>):Locale=>match?.locale??(new URL(request.url).pathname.startsWith('/en/')?'en':requestLocale(request));

async function localePreference(request:Request,config:AuthConfig|null,db:D1Database|undefined){
 const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});
 if(!config||!db)return json({error:'SSO_NOT_CONFIGURED'},503);
 let current;try{current=await session(request,config);}catch{return json({error:'SESSION_UNAVAILABLE'},503);}
 if(!current)return json({locale:null},401);
 if(request.method!=='GET'&&request.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
 try{
  if(request.method==='POST'){
   if(!sameOrigin(request,config.origin))return json({error:'INVALID_ORIGIN'},403);
   if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return json({error:'JSON_REQUIRED'},415);
   let body:{locale?:unknown;initial?:unknown}|null;
   try{body=JSON.parse(await boundedBody(request,1024)) as typeof body;}catch{return json({error:'INVALID_BODY'},400);}
   if(body?.locale!=='de'&&body?.locale!=='en')return json({error:'INVALID_LOCALE'},400);
   if(body.initial!==undefined&&typeof body.initial!=='boolean')return json({error:'INVALID_BODY'},400);
   const conflict=body.initial?'DO NOTHING':'DO UPDATE SET locale = excluded.locale, updated_at = excluded.updated_at';
   await db.prepare('INSERT INTO user_preferences (issuer, subject, locale, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(issuer, subject) '+conflict)
    .bind(current.issuer,current.sub,body.locale,Date.now()).run();
   if(!body.initial)return json({locale:body.locale});
  }
  const row=await db.prepare('SELECT locale FROM user_preferences WHERE issuer = ? AND subject = ?').bind(current.issuer,current.sub).first<{locale:Locale}>();
  return json({locale:row?.locale??null});
 }catch{return json({error:'PREFERENCE_UNAVAILABLE'},503);}
}

export default {
 async fetch(request:Request,env:Env={}):Promise<Response>{
  const url=new URL(request.url),path=url.pathname,origin=env.SITE_ORIGIN??DEFAULT_ORIGIN,matched=matchRoute(path),locale=pageLocale(request,matched);
  const nonce=crypto.randomUUID().replaceAll('-','');
  const publicPaths=new Set<string>(publicRouteIds.flatMap(id=>locales.map(language=>route(id,language))));
  const isPrivate=!publicPaths.has(path)&&!['/styles.css','/client.js','/favicon.svg','/robots.txt','/sitemap.xml'].includes(path);
  const finish=(response:Response)=>{const secured=secure(response,isPrivate,nonce,!!matched||path.startsWith('/identity/'));
   const routeId=matched?.id;if(routeId&&['account','signIn','signUp'].includes(routeId))secured.headers.set('Referrer-Policy','same-origin');return secured;};
  if(url.protocol==='http:'&&!['localhost','127.0.0.1'].includes(url.hostname))return finish(new Response(null,{status:308,headers:{location:'https://'+url.host+url.pathname+url.search}}));
  if((request.method==='GET'||request.method==='HEAD')&&matched?.locale==='de'&&!cookieLocale(request)&&browserLocale(request.headers.get('accept-language'))==='en')return finish(redirect(route(matched.id,'en')+url.search,languageCookie('en')));
  if(path==='/styles.css'&&request.method==='GET')return finish(text(css+identityCss,'text/css'));
  if(path==='/client.js'&&request.method==='GET')return finish(text(clientScript,'text/javascript'));
  if(path==='/favicon.svg'&&request.method==='GET')return finish(text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#f7f7f2"/><rect x="8" y="8" width="10" height="10" rx="3" fill="#ac95d2"/><rect x="22" y="8" width="10" height="10" rx="3" fill="#dba677"/><rect x="8" y="22" width="10" height="10" rx="3" fill="#8faec3"/><rect x="22" y="22" width="10" height="10" rx="3" fill="#9fb681"/></svg>','image/svg+xml'));
  if(path==='/robots.txt'&&request.method==='GET'){
   const privateRoutes=['account','signIn','signUp','signedOut','privacy'] as RouteId[];
   const rules=privateRoutes.flatMap(id=>locales.map(language=>'Disallow: '+route(id,language))).join('\n');
   return finish(text(env.PUBLIC_INDEXING==='true'?`User-agent: *\nAllow: /\n${rules}\nDisallow: /auth/\nDisallow: /api/\nDisallow: /identity/\nSitemap: ${origin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n','text/plain'));
  }
  if(path==='/sitemap.xml'&&request.method==='GET'){
   const urls=env.PUBLIC_INDEXING==='true'?publicRouteIds.flatMap(id=>locales.map(language=>`<url><loc>${escapeHtml(origin+route(id,language))}</loc><xhtml:link rel="alternate" hreflang="de" href="${escapeHtml(origin+route(id,'de'))}"/><xhtml:link rel="alternate" hreflang="en" href="${escapeHtml(origin+route(id,'en'))}"/><xhtml:link rel="alternate" hreflang="x-default" href="${escapeHtml(origin+route(id,'de'))}"/></url>`)).join(''):'';
   return finish(text(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>`,'application/xml'));
  }
  const central=identityConfig(env);
  const config=authConfig(env);
  const migration=migrationConfig(env,origin,config?.issuer,env.AUTH_DB);
  if(path.startsWith('/api/identity/'))return finish(central?await identityProxy(request,central,migration):Response.json({error:'IDENTITY_NOT_CONFIGURED'},{status:503}));
  if(path.startsWith('/api/migrations/receipts/'))return finish(migration?await receiveMigrationReceipt(request,migration):Response.json({error:'NOT_FOUND'},{status:404}));
  if(path==='/api/preferences/locale')return finish(await localePreference(request,config,env.AUTH_DB));
  if(path.startsWith('/identity/')){
   if(!central)return finish(text(t(locale,'error.notConfigured'),'text/plain',503));
   if(!['/identity/login','/identity/consent','/identity/account','/identity/reset'].includes(path))return finish(text(t(locale,'notFound.body'),'text/plain',404));
   if(url.origin!==central.origin)return finish(text(t(locale,'error.invalidHost'),'text/plain',421));
   if(request.method!=='GET')return finish(text(t(locale,'error.method'),'text/plain',405));
   const csrf=identityCsrf(request),page=identityPage(path,url.search.slice(1),csrf.value,central,locale);
   const response=finish(text(layout(page.body,{origin:central.origin,path,locale,title:page.title,titleKey:page.titleKey,description:t(locale,'identity.metaDescription'),descriptionKey:'identity.metaDescription',indexing:false,nonce}),'text/html',page.status));
   response.headers.append('set-cookie',csrf.setCookie);return response;
  }
  if((path.startsWith('/auth/')||path.startsWith('/api/')||matched?.id==='account')&&config&&url.origin!==config.origin)return finish(text(t(locale,'error.invalidHost'),'text/plain',421));
  if(path.startsWith('/auth/')){
   if(!config)return finish(Response.json({error:'SSO_NOT_CONFIGURED',message:t(locale,'error.notConfigured')},{status:503}));
   try{
    if(path==='/auth/login'){
     const response=await startLogin(request,config);
     return finish(response.status===503?text(t(locale,'error.reauth'),'text/plain',503):response);
    }
    if(path==='/auth/callback')return finish(await callback(request,config));
    if(path==='/auth/logout')return finish(await logout(request,config));
    if(path==='/auth/backchannel-logout')return finish(await backchannelLogout(request,config));
   }catch{return finish(text(t(locale,'error.callback'),'text/plain',400));}
  }
  if(request.method!=='GET'&&request.method!=='HEAD')return finish(text(t(locale,'error.method'),'text/plain',405));
  let body:string,title=t(locale,'meta.title'),titleKey:MessageKey='meta.title',titleValues:Values|undefined,description=t(locale,'meta.description'),descriptionKey:MessageKey='meta.description',statusCode=200,schema:unknown,routeId=matched?.id;
  if(matched?.id==='home'){
   body=home(locale);schema={'@context':'https://schema.org','@type':'WebSite',name:'Worlds Hub',url:origin+route('home',locale),inLanguage:locale,description,hasPart:projects.filter(project=>project.url).map(project=>({'@type':'WebSite',name:project.name,url:project.url}))};
  }else if(matched&&['account','signIn','signUp'].includes(matched.id)){
   let current:Awaited<ReturnType<typeof session>>;try{current=config?await session(request,config):null;}catch{return finish(text(t(locale,'error.accountUnavailable'),'text/plain',503));}
   let accountUrl:string|undefined;if(env.OIDC_ACCOUNT_URL){const candidate=new URL(env.OIDC_ACCOUNT_URL);if(candidate.protocol==='https:'&&!candidate.username&&!candidate.password)accountUrl=candidate.href;}
   const migrationStatus=current&&migration?await readMigrationStatus(migration,current.sub).catch(()=>undefined):undefined;
   body=account(current,!!config,locale,accountUrl,!!central,migrationStatus);title=t(locale,'account.title');titleKey='account.title';description=t(locale,'account.description');descriptionKey='account.description';
  }else if(matched?.id==='signedOut'){body=loggedOut(locale);title=t(locale,'logout.metaTitle');titleKey='logout.metaTitle';}
  else if(matched?.id==='privacy'){body=privacy(locale);title=t(locale,'privacy.metaTitle');titleKey='privacy.metaTitle';}
  else if(matched?.id.startsWith('world:')){
   const project=projects.find(candidate=>matched.id===`world:${candidate.id}`)!;
   titleKey='detail.metaTitle';titleValues={name:project.name,eyebrow:{key:`projects.${project.id}.eyebrow`}};
   body=detail(project,locale);title=t(locale,titleKey,titleValues);descriptionKey=`projects.${project.id}.description`;description=t(locale,descriptionKey);
  }else{statusCode=404;title=t(locale,'notFound.title');titleKey='notFound.title';body=notFound(locale);routeId=undefined;}
  const canonicalPath=matched?.canonical??path;
  const html=layout(body,{origin,path:canonicalPath,routeId,locale,title,titleKey,titleValues,description,descriptionKey,indexing:env.PUBLIC_INDEXING==='true'&&!isPrivate&&statusCode===200,verification:env.GOOGLE_SITE_VERIFICATION,schema,nonce});
  const response=finish(text(request.method==='HEAD'?'':html,'text/html',statusCode));
  if(env.PUBLIC_INDEXING!=='true')response.headers.set('X-Robots-Tag','noindex, nofollow');return response;
 },
 async scheduled(_event:unknown,env:Env){if(env.AUTH_DB)await env.AUTH_DB.batch(['auth_transactions','auth_sessions','auth_replays','identity_rate_limits'].map(table=>env.AUTH_DB!.prepare(`DELETE FROM ${table} WHERE id IN (SELECT id FROM ${table} WHERE expires < ? ORDER BY expires LIMIT 500)`).bind(Date.now())));}
};
