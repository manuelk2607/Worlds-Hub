import { handleAuthProxyRequest, NEON_AUTH_SESSION_COOKIE_NAME, NEON_AUTH_SESSION_DATA_COOKIE_NAME, resolveNeonAuthLogging } from '@neon/auth/server';
import { boundedBody, cookie, readCookie, sameOrigin, SESSION_COOKIE, token } from '../packages/auth/oidc.ts';
import { D1AuthStore, hash } from '../packages/auth/store.ts';
import {requestLocale,t} from './i18n/core.ts';
import {readMigrationStatus,type MigrationConfig} from './migration-receipts.ts';
import {passwordPolicyError} from './identity-policy.ts';
import {revokeHubSessions} from './hub-session-revocation.ts';
import {bindPilotSessionRecipients,deliverProjectRevocations,pilotSessionOrigin,pilotSessionServices,projectSessionEventConfig,type ProjectSessionEventEnv,type ProjectSessionEvents} from './project-session-events.ts';
export interface IdentityClient { clientId:string; name:string; redirects:string[]; resource:string }
export interface DeviceSignOutPilot { subject:string; expiresAt:number }
export interface IdentityConfig { origin:string; baseUrl:string; cookieSecret:string; clients:IdentityClient[]; db:D1Database; deviceSignOutEnabled?:boolean; deviceSignOutPilot?:DeviceSignOutPilot; projectSessionEvents?:ProjectSessionEvents }
export interface IdentityEnv extends ProjectSessionEventEnv { IDENTITY_ENABLED?:string; SITE_ORIGIN?:string; IDENTITY_AUTH_URL?:string; IDENTITY_COOKIE_SECRET?:string; IDENTITY_CLIENTS?:string; AUTH_DB?:D1Database; IDENTITY_DEVICE_SIGN_OUT_ENABLED?:string; IDENTITY_DEVICE_SIGN_OUT_PILOT?:string }
const pilotOrigins=pilotSessionServices.map(({service})=>pilotSessionOrigin(service));
const CSRF_COOKIE='__Host-worlds-identity-csrf';
const quiet=resolveNeonAuthLogging({logLevel:'silent'});
const endpoints:Record<string,string>={
  'get-session':'GET','sign-in/email':'POST','sign-up/email':'POST','sign-out':'POST',
  'email-otp/send-verification-otp':'POST','email-otp/verify-email':'POST',
  'request-password-reset':'POST','reset-password':'POST','update-user':'POST',
  'change-password':'POST','export':'POST','revoke-sessions':'POST',
  'oauth2/continue':'POST','oauth2/consent':'POST'
};
export function parseDeviceSignOutPilot(raw:string|undefined,now=Date.now()):DeviceSignOutPilot|undefined {
  try {
    const value=JSON.parse(raw??'null') as Partial<DeviceSignOutPilot>|null;
    if(typeof value?.subject!=='string'||!/^[A-Za-z0-9_-]{1,256}$/.test(value.subject)||
      typeof value.expiresAt!=='number'||!Number.isSafeInteger(value.expiresAt)||value.expiresAt<=now)return;
    return {subject:value.subject,expiresAt:value.expiresAt};
  }catch{return;}
}
export function identityConfig(env:IdentityEnv):IdentityConfig|null {
  if(env.IDENTITY_ENABLED!=='true'||!env.SITE_ORIGIN||!env.IDENTITY_AUTH_URL||!env.IDENTITY_COOKIE_SECRET||env.IDENTITY_COOKIE_SECRET.length<32||!env.AUTH_DB)return null;
  try {
    const origin=new URL(env.SITE_ORIGIN),issuer=new URL(env.IDENTITY_AUTH_URL);
    if(origin.protocol!=='https:'||origin.origin!==env.SITE_ORIGIN||issuer.protocol!=='https:'||issuer.username||issuer.password||issuer.search||issuer.hash)return null;
    const clients=JSON.parse(env.IDENTITY_CLIENTS??'[]') as IdentityClient[];
    if(!Array.isArray(clients)||clients.some(c=>typeof c.clientId!=='string'||!c.clientId||typeof c.name!=='string'||!c.name||!Array.isArray(c.redirects)||!c.redirects.length||typeof c.resource!=='string'||new URL(c.resource).protocol!=='https:'||c.redirects.some(r=>{const u=new URL(r);return u.protocol!=='https:'||!!u.username||!!u.password||!!u.hash||!!u.search;})))return null;
    const baseUrl=issuer.href.replace(/\/$/,'');
    const globalSignOut=env.IDENTITY_DEVICE_SIGN_OUT_ENABLED==='true';
    const pilot=env.IDENTITY_DEVICE_SIGN_OUT_ENABLED==='pilot'?parseDeviceSignOutPilot(env.IDENTITY_DEVICE_SIGN_OUT_PILOT):undefined;
    const pilotClients=pilot?pilotOrigins.map(target=>clients.find(client=>
      client.redirects.length===1&&client.redirects[0]===target+'/auth/callback'&&client.resource===target+'/api'
    )).filter((client):client is IdentityClient=>!!client):[];
    const eventSettings=pilot?{...env,WORLDS_SESSION_EVENT_CLIENT_IDS:JSON.stringify(pilotClients.map(client=>client.clientId))}:env;
    const projectSessionEvents=globalSignOut||(pilot&&pilotClients.length===pilotOrigins.length)
      ?projectSessionEventConfig(eventSettings,origin.origin,baseUrl,pilot?pilotClients:clients,env.AUTH_DB):undefined;
    if(pilot&&projectSessionEvents)bindPilotSessionRecipients(projectSessionEvents,env);
    const deviceSignOutPilot=projectSessionEvents?pilot:undefined;
    return {origin:origin.origin,baseUrl,cookieSecret:env.IDENTITY_COOKIE_SECRET,clients,db:env.AUTH_DB,
      deviceSignOutEnabled:globalSignOut||!!deviceSignOutPilot,deviceSignOutPilot,projectSessionEvents};
  }catch{return null;}
}
export function identityCsrf(request:Request){const previous=readCookie(request,CSRF_COOKIE);const value=previous&&/^[A-Za-z0-9_-]{32,128}$/.test(previous)?previous:token();return {value,setCookie:cookie(CSRF_COOKIE,value,3600)};}
export function authorizationClient(rawQuery:string,config:Pick<IdentityConfig,'clients'>):IdentityClient|null {
  if(!rawQuery||rawQuery.length>8192)return null;
  const query=new URLSearchParams(rawQuery),id=query.get('client_id'),redirect=query.get('redirect_uri');
  if(query.getAll('client_id').length!==1||query.getAll('redirect_uri').length!==1)return null;
  const client=config.clients.find(c=>c.clientId===id&&c.redirects.includes(redirect??''));
  if(!client)return null;
  const scopes=(query.get('scope')??'').split(' ').filter(Boolean);
  if(!scopes.includes('openid')||scopes.some(s=>!['openid','profile','email'].includes(s)))return null;
  const resources=query.getAll('resource');if(resources.length!==1||resources[0]!==client.resource)return null;
  return client;
}
function allowedResultUrl(raw:unknown,oauthQuery:string|undefined,config:IdentityConfig) {
  if(typeof raw!=='string')return undefined;
  const url=new URL(raw,config.origin);
  if(url.username||url.password||url.hash)return undefined;
  if(url.origin===config.origin&&['/identity/login','/identity/consent','/identity/account','/identity/reset'].includes(url.pathname))return url.href;
  if(oauthQuery){const client=authorizationClient(oauthQuery,config);if(client&&client.redirects.some(r=>{const expected=new URL(r);return expected.origin===url.origin&&expected.pathname===url.pathname&&expected.searchParams.size===0;}))return url.href;}
  return undefined;
}
/** Atomic per-IP/action bucket; raw IP addresses never enter the database. */
export async function limitIdentity(request:Request,path:string,config:IdentityConfig,now=Date.now()) {
  const ip=request.headers.get('cf-connecting-ip');if(!ip)throw new Error('RATE_LIMIT_IDENTITY_UNAVAILABLE');
  const window=path==='get-session'?60_000:600_000,limit=path==='get-session'?90:path.includes('sign-')?12:path.startsWith('oauth2/')?60:6;
  const bucket=Math.floor(now/window),key=await hash(config.cookieSecret+':'+ip+':'+path+':'+bucket);
  const row=await config.db.prepare('INSERT INTO identity_rate_limits (id, count, expires) VALUES (?, 1, ?) ON CONFLICT(id) DO UPDATE SET count = count + 1 RETURNING count').bind(key,(bucket+1)*window).first<{count:number}>();
  return !!row&&row.count<=limit;
}

function requestProvider(request:Request,config:IdentityConfig,path:string,data?:Record<string,unknown>,noRefresh=false) {
  const url=new URL(request.url);
  if(path==='get-session')url.searchParams.set('disableCookieCache','true');
  if(noRefresh)url.searchParams.set('disableRefresh','true');
  const upstream=new Request(url,{method:data?'POST':'GET',headers:request.headers,...(data?{body:JSON.stringify(data)}:{})});
  return handleAuthProxyRequest({request:upstream,path,baseUrl:config.baseUrl,cookieSecret:config.cookieSecret,sessionDataTtl:1,sameSite:'lax',log:quiet});
}

async function verifiedAccount(request:Request,config:IdentityConfig,noRefresh=false) {
  const response=await requestProvider(request,config,'get-session',undefined,noRefresh);
  if(response.status===401||response.status===403)return null;
  if(!response.ok)throw new Error('Session lookup failed');
  const data=await response.json() as {user?:{id?:unknown;email?:unknown;name?:unknown;emailVerified?:unknown};session?:{userId?:unknown}}|null;
  const user=data?.user;
  if(!data?.session||!user||typeof user.id!=='string'||!user.id||typeof user.email!=='string'||user.emailVerified!==true)return null;
  if((noRefresh||data.session.userId!==undefined)&&data.session.userId!==user.id)return null;
  return {id:user.id,email:user.email,name:typeof user.name==='string'?user.name:null,emailVerified:true};
}

export async function identityProxy(request:Request,config:IdentityConfig,migration?:MigrationConfig|null) {
  const url=new URL(request.url),path=url.pathname.slice('/api/identity/'.length);
  const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});
  if(url.origin!==config.origin)return json({error:'INVALID_HOST'},421);
  if(!Object.hasOwn(endpoints,path))return json({error:'NOT_FOUND'},404);
  if(path==='revoke-sessions'&&!config.deviceSignOutEnabled)return json({error:'NOT_FOUND'},404);
  if(endpoints[path]!==request.method)return json({error:'METHOD_NOT_ALLOWED'},405);
  let data:Record<string,unknown>|undefined,oauthQuery:string|undefined;
  if(request.method==='POST'){
    if(!sameOrigin(request,config.origin))return json({error:'INVALID_ORIGIN'},403);
    const csrf=readCookie(request,CSRF_COOKIE);if(!csrf||request.headers.get('x-worlds-identity-csrf')!==csrf)return json({error:'INVALID_CSRF'},403);
    if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return json({error:'JSON_REQUIRED'},415);
    let raw:string;try{raw=await boundedBody(request,12288);data=JSON.parse(raw) as Record<string,unknown>;if(!data||typeof data!=='object'||Array.isArray(data))throw new Error();}catch{return json({error:'INVALID_BODY'},400);}
    if(typeof data.oauth_query==='string'){oauthQuery=data.oauth_query;if(!authorizationClient(oauthQuery,config))return json({error:'UNTRUSTED_AUTHORIZATION_REQUEST'},400);}
    if(path.startsWith('oauth2/')&&!oauthQuery)return json({error:'SIGNED_AUTHORIZATION_REQUEST_REQUIRED'},400);
    const fields:Record<string,string[]>={
      'sign-in/email':['email','password','oauth_query'],'sign-up/email':['email','password','name'],
      'email-otp/send-verification-otp':['email'],'email-otp/verify-email':['email','otp'],
      'request-password-reset':['email'],'reset-password':['token','newPassword'],
      'update-user':['name'],'sign-out':[],'change-password':['currentPassword','newPassword'],'export':[],'revoke-sessions':[]
    };
    if(fields[path]){
      data=Object.fromEntries(fields[path].filter(k=>data![k]!==undefined).map(k=>[k,data![k]]));
      if(Object.values(data).some(v=>typeof v!=='string'))return json({error:'INVALID_FIELDS'},400);
    }
    const passwordFields:Record<string,{name:string;isNew:boolean}[]>={
      'sign-in/email':[{name:'password',isNew:false}],
      'sign-up/email':[{name:'password',isNew:true}],
      'reset-password':[{name:'newPassword',isNew:true}],
      'change-password':[{name:'currentPassword',isNew:false},{name:'newPassword',isNew:true}]
    };
    for(const field of passwordFields[path]??[]){
      const error=passwordPolicyError(data[field.name],field.isNew);
      if(error)return json({error},400);
    }
    if(path==='request-password-reset')data.redirectTo=config.origin+'/identity/reset';
    if(path==='sign-up/email')data.callbackURL=config.origin+'/identity/account';
    // Never accept arbitrary callback/redirect fields from the browser.
    if(path==='sign-in/email')delete data.callbackURL;
    if(path==='email-otp/send-verification-otp')data.type='email-verification';
    if(path==='change-password'){
      data.revokeOtherSessions=true;
    }
    if(path==='oauth2/continue')data={selected:true,oauth_query:oauthQuery};
    if(path==='oauth2/consent'){if(typeof data.accept!=='boolean')return json({error:'EXPLICIT_CONSENT_REQUIRED'},400);data={accept:data.accept,oauth_query:oauthQuery};}
  }
  try{if(!await limitIdentity(request,path,config))return json({error:'RATE_LIMITED',message:t(requestLocale(request),'error.rateLimited')},429);}catch{return json({error:'RATE_LIMIT_UNAVAILABLE'},503);}
  let account:Awaited<ReturnType<typeof verifiedAccount>>=null;
  if(path==='change-password'||path==='export'||path==='revoke-sessions'){
    try{account=await verifiedAccount(request,config,path==='revoke-sessions');}catch{return json({error:'IDENTITY_UNAVAILABLE'},503);}
    if(!account)return json({error:'SIGN_IN_REQUIRED'},401);
  }
  if(path==='revoke-sessions'&&account){
    const pilot=config.deviceSignOutPilot;
    if(pilot&&(pilot.expiresAt<=Date.now()||pilot.subject!==account.id))return json({error:'NOT_FOUND'},404);
    // Commit local revocation before ending the verified native session so
    // a transient local storage failure can be retried from the same browser.
    const projects=config.projectSessionEvents;
    try{await revokeHubSessions(config.db,config.baseUrl,account.id,Date.now(),projects);}
    catch{return json({error:'IDENTITY_UNAVAILABLE'},503);}
    try{
      const provider=await requestProvider(request,config,path,{});
      const result=provider.ok?await provider.json() as {status?:unknown}|null:null;
      if(result?.status!==true)return json({error:'DEVICE_SIGN_OUT_PARTIAL'},503);
      const projectSessionsEnded=projects?await deliverProjectRevocations(projects,account.id).catch(()=>false):undefined;
      const response=json({success:true,...(projectSessionsEnded===undefined?{}:{projectSessionsEnded})});
      for(const value of provider.headers.getSetCookie())response.headers.append('set-cookie',value);
      for(const name of [NEON_AUTH_SESSION_COOKIE_NAME,NEON_AUTH_SESSION_DATA_COOKIE_NAME,SESSION_COOKIE])response.headers.append('set-cookie',cookie(name,'',0));
      return response;
    }catch{return json({error:'DEVICE_SIGN_OUT_PARTIAL'},503);}
  }
  if(path==='export'&&account){
    try{
      const preference=await config.db.prepare('SELECT locale FROM user_preferences WHERE issuer = ? AND subject = ?')
        .bind(config.baseUrl,account.id).first<{locale:string}>();
      const migrations=migration?.identityIssuer===config.baseUrl?await readMigrationStatus(migration,account.id):undefined;
      const response=json({exportedAt:new Date().toISOString(),identity:{issuer:config.baseUrl,...account},
        preferences:{locale:preference?.locale??null},...(migrations?{migrations}:{})});
      response.headers.set('Content-Disposition','attachment; filename="worlds-identity.json"');
      return response;
    }catch{return json({error:'IDENTITY_UNAVAILABLE'},503);}
  }
  let response:Response;try{response=await requestProvider(request,config,path,data);}catch{return json({error:'IDENTITY_UNAVAILABLE'},503);}
  const headers=new Headers({'content-type':'application/json','cache-control':'no-store','x-robots-tag':'noindex, nofollow'});
  response.headers.getSetCookie().forEach(c=>headers.append('set-cookie',c));
  let body:Record<string,unknown>;try{const parsed=await response.json();body=parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed as Record<string,unknown>:{};}catch{return json({error:'IDENTITY_UNAVAILABLE'},502);}
  if(path==='change-password'&&account){
    if(!response.ok){
      const code=typeof body.code==='string'&&/^[A-Z0-9_]{1,80}$/.test(body.code)?body.code:'IDENTITY_UNAVAILABLE';
      return json({error:code},response.status);
    }
    const changedUser=body.user as {id?:unknown}|undefined;
    if(changedUser?.id!==account.id)return json({error:'IDENTITY_UNAVAILABLE'},502);
    let hubSessionsRevoked=true;
    try{await new D1AuthStore(config.db).revokeIdentity(config.baseUrl,account.id);}
    catch{hubSessionsRevoked=false;}
    return new Response(JSON.stringify({success:true,hubSessionsRevoked}),{status:response.status,headers});
  }
  // Do not expose raw session tokens or set-auth-token/set-auth-jwt headers from the managed API.
  const result:Record<string,unknown>={};
  const session=body.session as {expiresAt?:unknown;createdAt?:unknown;userId?:unknown}|undefined,user=body.user as {id?:unknown;name?:unknown;email?:unknown;emailVerified?:unknown}|undefined;
  if(user)result.user={id:user.id,name:user.name,email:user.email,emailVerified:user.emailVerified};
  if(session)result.session={expiresAt:session.expiresAt,createdAt:session.createdAt};
  for(const k of ['status','success','redirect','code','message','error'])if(['boolean','string'].includes(typeof body[k]))result[k]=body[k];
  if(body.url!==undefined){const target=allowedResultUrl(body.url,oauthQuery,config);if(!target)return json({error:'UNTRUSTED_IDENTITY_REDIRECT'},502);result.url=target;}
  if(path==='get-session'&&!user){result.user=null;result.session=null;}
  const pilot=config.deviceSignOutPilot;
  if(path==='get-session'&&response.ok&&config.deviceSignOutEnabled&&pilot&&pilot.expiresAt>Date.now()&&
    user?.emailVerified===true&&user.id===pilot.subject&&session?.userId===pilot.subject)result.deviceSignOutAllowed=true;
  return new Response(JSON.stringify(result),{status:response.status,headers});
}
