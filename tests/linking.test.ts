import {test} from 'node:test';
import assert from 'node:assert/strict';
import { prepareLink,confirmLink,projectAccount,canGenerate,type LinkStore,type LinkBinding } from '../packages/auth/linking.ts';
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
