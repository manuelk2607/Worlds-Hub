import {createAuthServer,NEON_AUTH_SESSION_COOKIE_NAME,resolveNeonAuthLogging} from '@neon/auth/server';

// This harness is deliberately incapable of selecting a production issuer.
export const ADMIN_QA_ISSUER='https://ep-little-recipe-baraxhx4.neonauth.c-8.eu-central-1.aws.neon.tech/worlds_identity/auth';
type Kind='admin'|'target'|'control';
type Created={kind:Kind;id:string};
type Client=ReturnType<typeof createAuthServer>;
// The installed server SDK exposes this namespace at runtime but types it as
// unknown. Narrow only these documented methods; validate every returned row.
type ApiResult<T>={data:T|null;error:{status?:number}|null};
type AdminApi={
 listUserSessions(input:{userId:string}):Promise<ApiResult<{sessions:{userId:string}[]}>>;
 revokeUserSessions(input:{userId:string}):Promise<ApiResult<unknown>>;
 removeUser(input:{userId:string}):Promise<ApiResult<unknown>>;
};
type Fixture={id:string;email:string;password:string;cookies:Map<string,string>;client:Client};
const quiet=resolveNeonAuthLogging({logLevel:'silent'});
const status=(value:{error?:{status?:number}|null})=>value.error?value.error.status??503:200;
const ensure=(value:unknown,code:string)=>{if(!value)throw new Error(code);};
export async function beginNativeAdminQa(created:(value:Created)=>void){
 const fixtures:Partial<Record<Kind,Fixture>>={},sessions:Client[]=[],secret=crypto.randomUUID()+crypto.randomUUID();let attempted=false,cleaned=false;
 const client=(cookies:Map<string,string>)=>createAuthServer({baseUrl:ADMIN_QA_ISSUER,cookieSecret:secret,sessionDataTtl:1,log:quiet,
  context:()=>({getCookies:()=>{const raw=cookies.get(NEON_AUTH_SESSION_COOKIE_NAME);return raw?NEON_AUTH_SESSION_COOKIE_NAME+'='+raw:'';},
   setCookie:(name,value)=>{if(name===NEON_AUTH_SESSION_COOKIE_NAME)cookies.set(name,value);},getOrigin:()=>new URL(ADMIN_QA_ISSUER).origin,getHeader:()=>null,getFramework:()=> 'worlds-qa'})});
 const current=async(actor:Fixture)=>{
  const result=await actor.client.getSession({query:{disableCookieCache:true,disableRefresh:true}});
  ensure(!result.error&&result.data?.user?.id===actor.id,'QA_SESSION_NOT_CONFIRMED');return result.data!;
 };
 const create=async(kind:Kind)=>{
  const cookies=new Map<string,string>(),api=client(cookies),email='worlds-admin-qa-'+crypto.randomUUID()+'@worlds.invalid',password=crypto.randomUUID()+'!Aa1';
  sessions.push(api);
  const response=await api.signUp.email({email,password,name:'Disposable admin QA '+kind});
  const id=response.data?.user?.id;
  ensure(!response.error&&typeof id==='string'&&/^[0-9a-f-]{36}$/i.test(id),'QA_CREATION_FAILED');
  const actor:Fixture={id:id!,email,password,cookies,client:api};fixtures[kind]=actor;created({kind,id:id!});
  await current(actor);return actor;
 };
 const cleanup=async()=>{
  if(cleaned)return {sessionCleanupFailures:0};cleaned=true;
  let failures=0;
  for(const api of sessions){try{const r=await api.signOut();if(r.error&&r.error.status!==401)failures++;}catch{failures++;}}
  for(const actor of Object.values(fixtures)){actor.cookies.clear();actor.password='';actor.email='';}
  return {sessionCleanupFailures:failures};
 };
 try{
  const admin=await create('admin'),target=await create('target'),control=await create('control');
  ensure(new Set([admin.id,target.id,control.id]).size===3,'QA_IDENTITIES_NOT_DISTINCT');
  // The initial target session and a second sign-in are both retained privately.
  const firstTarget=target.client;
  const targetSecondCookies=new Map<string,string>(),targetSecond=client(targetSecondCookies);sessions.push(targetSecond);
  const second=await targetSecond.signIn.email({email:target.email,password:target.password});ensure(!second.error&&second.data?.user?.id===target.id,'QA_SECOND_SESSION_FAILED');
  return {ids:{admin:admin.id,target:target.id,control:control.id},cleanup,
   probe:async()=>{
    ensure(!attempted&&!cleaned,'QA_PROBE_ALREADY_ATTEMPTED');attempted=true;
    // The operator must grant admin to this newly created actor before calling.
    // Use a new session rather than the pre-grant signup snapshot.
    const adminCookies=new Map<string,string>(),fresh=client(adminCookies);sessions.push(fresh);
    const signed=await fresh.signIn.email({email:admin.email,password:admin.password});ensure(!signed.error&&signed.data?.user?.id===admin.id,'QA_FRESH_ADMIN_LOGIN_FAILED');
    const verified=await fresh.getSession({query:{disableCookieCache:true,disableRefresh:true}});
    const role=(verified.data?.user as {role?:unknown}|undefined)?.role;
    ensure(!verified.error&&verified.data?.user?.id===admin.id&&typeof role==='string'&&role.split(',').includes('admin'),'QA_ADMIN_ROLE_NOT_CONFIRMED');
    const api=fresh.admin as AdminApi;
    ensure(typeof api.listUserSessions==='function'&&typeof api.revokeUserSessions==='function'&&typeof api.removeUser==='function','QA_ADMIN_METHODS_UNAVAILABLE');
    const listed=await api.listUserSessions({userId:target.id});
    if(listed.error)return {listStatus:status(listed),revocationAttempted:false,deletionAttempted:false};
    const rows=listed.data?.sessions;
    ensure(Array.isArray(rows)&&rows.length===2&&rows.every(row=>row.userId===target.id),'QA_TARGET_SESSION_SCOPE_INVALID');
    const revoked=await api.revokeUserSessions({userId:target.id});
    if(revoked.error)return {listStatus:200,revokeStatus:status(revoked),deletionAttempted:false};
    for(const api of [firstTarget,targetSecond]){
     const r=await api.getSession({query:{disableCookieCache:true,disableRefresh:true}});ensure((!r.error||r.error.status===401)&&!r.data?.user,'QA_TARGET_REVOCATION_NOT_CONFIRMED');
    }
    await current(control);
    // A fresh session of the same disposable target verifies removal too.
    const newCookies=new Map<string,string>(),newTarget=client(newCookies);sessions.push(newTarget);
    const relogged=await newTarget.signIn.email({email:target.email,password:target.password});ensure(!relogged.error&&relogged.data?.user?.id===target.id,'QA_TARGET_RELOGIN_FAILED');
    const removed=await api.removeUser({userId:target.id});
    if(removed.error)return {listStatus:200,revokeStatus:200,controlRetained:true,removeStatus:status(removed)};
    const ended=await newTarget.getSession({query:{disableCookieCache:true,disableRefresh:true}});ensure((!ended.error||ended.error.status===401)&&!ended.data?.user,'QA_REMOVAL_SESSION_NOT_ENDED');
    await current(control);
    return {listStatus:200,revokeStatus:200,removeStatus:200,controlRetained:true,targetSessionEnded:true};
   }};
 }catch(error){await cleanup();throw error;}
}
