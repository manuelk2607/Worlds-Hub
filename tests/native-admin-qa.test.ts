import {test,type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {beginNativeAdminQa,ADMIN_QA_ISSUER} from '../scripts/lib/native-admin-qa.ts';

function mockProvider(t:TestContext,listStatus=200){
 const users=new Map<string,{id:string;email:string;password:string;name:string;role:string}>(),sessions=new Map<string,string>();
 const paths:string[]=[];let adminEnabled=false;
 t.mock.method(globalThis,'fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=new URL(String(input));assert.equal(url.origin+url.pathname.split('/auth')[0]+'/auth',ADMIN_QA_ISSUER);
  const path=url.pathname.slice(new URL(ADMIN_QA_ISSUER).pathname.length);paths.push(path);
  const cookie=new Headers(init?.headers).get('cookie')??'',key=/__Secure-neon-auth.session_token=([^;]+)/.exec(cookie)?.[1];
  const id=key?sessions.get(key):undefined,user=id?users.get(id):undefined,body=init?.body?JSON.parse(String(init.body)):{};
  const data=(u:NonNullable<typeof user>)=>({user:{id:u.id,name:u.name,email:u.email,role:u.name.endsWith('admin')&&adminEnabled?'admin':u.role,emailVerified:false},session:{id:key,userId:u.id,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+60_000).toISOString()}});
  const signed=(u:NonNullable<typeof user>)=>{const token=crypto.randomUUID();sessions.set(token,u.id);return Response.json({user:data(u).user},{headers:{'set-cookie':'__Secure-neon-auth.session_token='+token+'; Secure; HttpOnly; Path=/'}});};
  if(path==='/sign-up/email'){const u={id:crypto.randomUUID(),email:body.email,password:body.password,name:body.name,role:'user'};users.set(u.id,u);return signed(u);}
  if(path==='/sign-in/email'){const u=[...users.values()].find(u=>u.email===body.email&&u.password===body.password);return u?signed(u):Response.json({message:'Invalid credentials'},{status:401});}
  if(path==='/get-session')return Response.json(user?data(user):null);
  if(path==='/sign-out'){if(key)sessions.delete(key);return Response.json({success:true});}
  if(path.startsWith('/admin/')){
   assert.ok(user?.name.endsWith('admin')&&adminEnabled,'The probe must authenticate the freshly elevated fixture');
   assert.ok(users.get(body.userId)?.name.endsWith('target'),'Only the freshly created target may be inspected or changed');
   if(path==='/admin/list-user-sessions')return listStatus===200?Response.json({sessions:[...sessions].filter(([,id])=>id===body.userId).map(([token,id])=>({id:token,userId:id,token}))}):Response.json({message:'Not supported'},{status:listStatus});
   if(path==='/admin/revoke-user-sessions'){for(const [token,id]of sessions)if(id===body.userId)sessions.delete(token);return Response.json({success:true});}
   if(path==='/admin/remove-user'){for(const [token,id]of sessions)if(id===body.userId)sessions.delete(token);users.delete(body.userId);return Response.json({success:true});}
  }
  throw Error('Unexpected test endpoint');
 });
 return {users,sessions,paths,elevate:()=>{adminEnabled=true;}};
}

test('the bounded admin harness uses the installed SDK namespace, confines actions to its target and keeps its control active',async t=>{
 const state=mockProvider(t),created:{kind:string;id:string}[]=[];
 const harness=await beginNativeAdminQa(value=>created.push(value));
 assert.equal(created.length,3);assert.equal(state.paths.some(p=>p.startsWith('/admin/')),false);
 state.elevate();
 const result=await harness.probe();assert.deepEqual(result,{listStatus:200,revokeStatus:200,removeStatus:200,controlRetained:true,targetSessionEnded:true});
 assert.equal(state.users.has(harness.ids.target),false);assert.equal(state.users.has(harness.ids.control),true);
 assert.ok([...state.sessions.values()].includes(harness.ids.control));
 await assert.rejects(harness.probe());
 assert.deepEqual(await harness.cleanup(),{sessionCleanupFailures:0});assert.equal(state.sessions.size,0);
 assert.equal(JSON.stringify(result).includes('@worlds.invalid'),false);
});

test('a refused administrative route stops without trying revocation or deletion; role verification precedes all admin calls',async t=>{
 const state=mockProvider(t,401),harness=await beginNativeAdminQa(()=>{});state.elevate();
 assert.deepEqual(await harness.probe(),{listStatus:401,revocationAttempted:false,deletionAttempted:false});
 assert.deepEqual(state.paths.filter(p=>p.startsWith('/admin/')),['/admin/list-user-sessions']);await harness.cleanup();
});

test('missing admin confirmation cannot trigger an administrative action',async t=>{
 const state=mockProvider(t),harness=await beginNativeAdminQa(()=>{});
 await assert.rejects(harness.probe(),/QA_ADMIN_ROLE_NOT_CONFIRMED/);
 assert.equal(state.paths.some(p=>p.startsWith('/admin/')),false);await harness.cleanup();
});
