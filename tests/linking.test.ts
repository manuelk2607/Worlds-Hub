import {test} from 'node:test';
import assert from 'node:assert/strict';
import { prepareLink,confirmLink,projectAccount,canGenerate,prepareManagedSessionLink,confirmManagedSessionLink,type ManagedSessionProof,type LinkStore,type LinkBinding } from '../packages/auth/linking.ts';
class Links implements LinkStore {
  proofs=new Map<string,LinkBinding>();links=new Map<string,string>();
  async stage(k:string,v:LinkBinding){this.proofs.set(k,v);}
  async lookup(i:string,s:string){return this.links.get(i+'|'+s)??null;}
  async consumeAndLink(k:string,session:string,now:number){const p=this.proofs.get(k);if(!p||p.expires<=now||p.sessionId!==session||this.links.has(p.issuer+'|'+p.subject)||[...this.links.values()].includes(p.localId))return false;this.proofs.delete(k);this.links.set(p.issuer+'|'+p.subject,p.localId);return true;}
}
const now=Date.now(),central={issuer:'https://idp.test',subject:'central-1',authenticatedAt:now,sessionId:'bound-session'},legacy={accountId:'historical-user-73',authenticatedAt:now,method:'managed-reauth' as const};
test('dual fresh proof links immutable historical ID exactly once',async()=>{const store=new Links();assert.equal(await store.lookup(central.issuer,central.subject),null);await assert.rejects(()=>projectAccount(central.issuer,central.subject,store));const p=await prepareLink(central,legacy,store,now);await assert.rejects(()=>confirmLink(p,'foreign-session',store,now));await confirmLink(p,central.sessionId,store,now);assert.equal(await projectAccount(central.issuer,central.subject,store),legacy.accountId);await assert.rejects(()=>confirmLink(p,central.sessionId,store,now));});
test('stale or future proof rejected; no email-based matching API',async()=>{const store=new Links();for(const time of [now-300001,now+1]){await assert.rejects(()=>prepareLink({...central,authenticatedAt:time},legacy,store,now));await assert.rejects(()=>prepareLink(central,{...legacy,authenticatedAt:time},store,now));}assert.equal(store.links.size,0);});
test('expired links and conflicting owners rejected without overwrite',async()=>{const store=new Links();const expired=await prepareLink(central,legacy,store,now);await assert.rejects(()=>confirmLink(expired,central.sessionId,store,now+300001));const a=await prepareLink(central,legacy,store,now);await confirmLink(a,central.sessionId,store,now);const b=await prepareLink({...central,subject:'attacker'},legacy,store,now);await assert.rejects(()=>confirmLink(b,central.sessionId,store,now));assert.equal(await store.lookup(central.issuer,central.subject),legacy.accountId);});
test('same subject at another issuer never inherits project access',async()=>{const store=new Links();const p=await prepareLink(central,legacy,store,now);await confirmLink(p,central.sessionId,store,now);await assert.rejects(()=>projectAccount('https://other.test',central.subject,store));});
test('staging cannot extend the lifetime of either authentication proof',async()=>{
 const store=new Links();
 const proof=await prepareLink(central,{...legacy,authenticatedAt:now-299_000},store,now);
 await assert.rejects(()=>confirmLink(proof,central.sessionId,store,now+1_001));
 await assert.rejects(()=>prepareLink({...central,authenticatedAt:now-300_000},legacy,store,now));
});
test('SSO alone never grants real AI generation; HF account/expiry and moderation required',()=>{const base={localAccountId:'old-id',moderationAllowed:true,personalHf:null};assert.equal(canGenerate(base,now),false);assert.equal(canGenerate({...base,personalHf:{accountId:'other',expiresAt:now+1000}},now),false);assert.equal(canGenerate({...base,personalHf:{accountId:'old-id',expiresAt:now-1}},now),false);assert.equal(canGenerate({...base,moderationAllowed:false,personalHf:{accountId:'old-id',expiresAt:now+1000}},now),false);assert.equal(canGenerate({...base,personalHf:{accountId:'old-id',expiresAt:now+1000}},now),true);});

const managed:ManagedSessionProof={kind:'managed-auth-session',issuer:'https://native.test/auth',accountId:legacy.accountId,
 sessionId:'server-validated-native-session-id',createdAt:now-86_400_000,expiresAt:now+86_400_000,validatedAt:now,privileged:false};
test('an existing managed session retains its real age and links its historical owner without another project password',async()=>{
 const store=new Links(),proof=await prepareManagedSessionLink(central,managed,store,now);
 const staged=[...store.proofs.values()][0];
 assert.equal(staged.expires,now+300_000);assert.match(staged.sessionId,/^[a-f0-9]{64}$/);
 assert.equal(JSON.stringify(staged).includes(managed.sessionId),false,'Native session identifiers must be hashed in staged bindings');
 await assert.rejects(()=>confirmLink(proof,central.sessionId,store,now),'A central session alone cannot consume a dual-session proof');
 await confirmManagedSessionLink(proof,central,{...managed,validatedAt:now+1},store,now+1);
 assert.equal(await projectAccount(central.issuer,central.subject,store),legacy.accountId);
 await assert.rejects(()=>confirmManagedSessionLink(proof,central,managed,store,now));
});
test('managed ownership requires a freshly validated live strong session, not a nickname or expired cached identity',async()=>{
 const store=new Links();
 for(const change of [{kind:'username-only'},{issuer:'http://native.test'},{issuer:'https://user:secret@native.test'},
  {issuer:'https://native.test/auth?foreign=issuer'},{accountId:''},{sessionId:''},{createdAt:NaN},{createdAt:now+1},
  {expiresAt:now},{expiresAt:Infinity},{validatedAt:now-15_000},{validatedAt:now+1},{privileged:undefined}]){
  await assert.rejects(()=>prepareManagedSessionLink(central,{...managed,...change} as ManagedSessionProof,store,now));
 }
 await assert.rejects(()=>prepareManagedSessionLink({...central,authenticatedAt:now-300_000},managed,store,now));
 assert.equal(store.proofs.size,0);assert.equal(store.links.size,0);
});
test('both validated sessions, issuers, owners and privilege state must still match at confirmation',async()=>{
 const store=new Links(),proof=await prepareManagedSessionLink(central,managed,store,now);
 for(const otherCentral of [{...central,sessionId:'other-browser'},{...central,issuer:'https://other.test'},
  {...central,subject:'other-subject'},{...central,authenticatedAt:now-1}]){
  await assert.rejects(()=>confirmManagedSessionLink(proof,otherCentral,managed,store,now));
 }
 for(const change of [{issuer:'https://other-native.test'},{accountId:'other-owner'},{sessionId:'replaced-native-session'},
  {createdAt:managed.createdAt-1},{privileged:true},{expiresAt:now-1},{validatedAt:now-15_000}]){
  await assert.rejects(()=>confirmManagedSessionLink(proof,central,{...managed,...change},store,now));
 }
 assert.equal(store.proofs.size,1);assert.equal(store.links.size,0);
 await confirmManagedSessionLink(proof,central,managed,store,now);
});
test('privileged existing accounts require fresh source authentication and staged proofs cannot outlive either source',async()=>{
 const store=new Links();
 await assert.rejects(()=>prepareManagedSessionLink(central,{...managed,privileged:true},store,now),/LEGACY_REAUTHENTICATION_REQUIRED/);
 const privileged={...managed,privileged:true,createdAt:now-299_000};
 const proof=await prepareManagedSessionLink(central,privileged,store,now);
 assert.equal([...store.proofs.values()][0].expires,now+1_000);
 await assert.rejects(()=>confirmManagedSessionLink(proof,central,{...privileged,validatedAt:now+1_000},store,now+1_000));
 const short=new Links(),nearExpiry={...managed,expiresAt:now+1_000};
 const second=await prepareManagedSessionLink(central,nearExpiry,short,now);
 // A provider refresh cannot lengthen the proof's original expiry.
 await assert.rejects(()=>confirmManagedSessionLink(second,central,{...managed,validatedAt:now+1_000},short,now+1_000));
 assert.equal(short.links.size,0);
});
