import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {PostgresLinkStore} from '../packages/auth/postgres-links.ts';
import {prepareLink,confirmLink,projectAccount,prepareManagedSessionLink,confirmManagedSessionLink} from '../packages/auth/linking.ts';

test('real local Postgres: account mapping is atomic and keeps historical owners',async t=>{
 const db=new PGlite();
 await db.exec(await readFile('docs/project-link-schema.sql','utf8'));
 await db.exec(`CREATE TABLE legacy_accounts (id TEXT PRIMARY KEY, role TEXT NOT NULL);
   INSERT INTO legacy_accounts VALUES ('historical-a','learner'),('historical-b','admin');
   ALTER TABLE worlds_identity_links ADD FOREIGN KEY (local_user_id) REFERENCES legacy_accounts(id);
   ALTER TABLE worlds_link_proofs ADD FOREIGN KEY (local_user_id) REFERENCES legacy_accounts(id);`);
 const store=new PostgresLinkStore(async(text,values)=>(await db.query<Record<string,unknown>>(text,values)).rows);
 const now=1_800_000_000_000;
 const central={issuer:'https://central.test',subject:'central-a',sessionId:'validated-session-a',authenticatedAt:now};
 const legacy={accountId:'historical-a',authenticatedAt:now,method:'managed-reauth' as const};
 const count=async(table:string)=>Number((await db.query<{n:number}>(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n);
 const reset=async()=>{await db.exec('TRUNCATE worlds_identity_links,worlds_link_proofs,worlds_link_audit RESTART IDENTITY');};
 try {
  await t.test('dual proof records exact historical ID and one audit without changing roles',async()=>{
   const proof=await prepareLink(central,legacy,store,now);
   await confirmLink(proof,central.sessionId,store,now);
   assert.equal(await projectAccount(central.issuer,central.subject,store),'historical-a');
   assert.equal(await count('worlds_link_proofs'),0);assert.equal(await count('worlds_link_audit'),1);
   assert.deepEqual((await db.query('SELECT * FROM legacy_accounts ORDER BY id')).rows,[{id:'historical-a',role:'learner'},{id:'historical-b',role:'admin'}]);
   await assert.rejects(()=>confirmLink(proof,central.sessionId,store,now));
   assert.equal(await store.lookup('https://other-issuer.test',central.subject),null);
  });
  await t.test('competing confirmation requests consume the proof once',async()=>{
   await reset();const proof=await prepareLink(central,legacy,store,now);
   const results=await Promise.allSettled([confirmLink(proof,central.sessionId,store,now),confirmLink(proof,central.sessionId,store,now)]);
   assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
   assert.equal(await count('worlds_identity_links'),1);assert.equal(await count('worlds_link_audit'),1);
  });
  await t.test('wrong browser session and expiry do not create a mapping',async()=>{
   await reset();const proof=await prepareLink(central,legacy,store,now);
   await assert.rejects(()=>confirmLink(proof,'different-validated-session',store,now));
   await assert.rejects(()=>confirmLink(proof,central.sessionId,store,now+300_000));
   assert.equal(await count('worlds_identity_links'),0);assert.equal(await count('worlds_link_audit'),0);
  });
  await t.test('both unique constraints reject takeover and roll back proof deletion',async()=>{
   await reset();await confirmLink(await prepareLink(central,legacy,store,now),central.sessionId,store,now);
   for(const [owner,account] of [[{...central,subject:'attacker'},legacy],[central,{...legacy,accountId:'historical-b'}]] as const){
    const proof=await prepareLink(owner,account,store,now);
    await assert.rejects(()=>confirmLink(proof,owner.sessionId,store,now));
   }
   assert.equal(await count('worlds_identity_links'),1);assert.equal(await count('worlds_link_audit'),1);
   assert.equal(await count('worlds_link_proofs'),2);
   assert.equal(await projectAccount(central.issuer,central.subject,store),'historical-a');
  });
  await t.test('audit failure rolls back mapping and proof consumption together',async()=>{
   await reset();await db.exec(`CREATE FUNCTION fail_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test-only audit failure'; END; $$;
     CREATE TRIGGER test_fail_audit BEFORE INSERT ON worlds_link_audit FOR EACH ROW EXECUTE FUNCTION fail_test_audit();`);
   const proof=await prepareLink(central,legacy,store,now);
   await assert.rejects(()=>confirmLink(proof,central.sessionId,store,now),/test-only audit failure/);
   assert.equal(await count('worlds_identity_links'),0);assert.equal(await count('worlds_link_proofs'),1);
   await db.exec('DROP TRIGGER test_fail_audit ON worlds_link_audit');
  });
  await t.test('parameterized identity values cannot become SQL or inherit another account',async()=>{
   await reset();const unusual={...central,subject:"subject'; DROP TABLE legacy_accounts; --"};
   await confirmLink(await prepareLink(unusual,legacy,store,now),unusual.sessionId,store,now);
   assert.equal(await store.lookup(central.issuer,unusual.subject),'historical-a');
   assert.equal(await count('legacy_accounts'),2);
   await assert.rejects(()=>prepareLink(central,{...legacy,accountId:'nonexistent-account'},store,now));
  });
  await t.test('an old live managed session binds both owners and consumes its proof atomically once',async()=>{
   await reset();
   const source={kind:'managed-auth-session' as const,issuer:'https://native.test/auth',accountId:legacy.accountId,
    sessionId:'original-managed-session',createdAt:now-86_400_000,expiresAt:now+60_000,validatedAt:now,privileged:false};
   const proof=await prepareManagedSessionLink(central,source,store,now);
   await assert.rejects(()=>confirmManagedSessionLink(proof,central,{...source,sessionId:'another-session'},store,now));
   assert.equal(await count('worlds_link_proofs'),1);
   const results=await Promise.allSettled([confirmManagedSessionLink(proof,central,source,store,now),confirmManagedSessionLink(proof,central,source,store,now)]);
   assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
   assert.equal(await count('worlds_link_proofs'),0);assert.equal(await count('worlds_link_audit'),1);
   assert.equal(await projectAccount(central.issuer,central.subject,store),legacy.accountId);
   assert.deepEqual((await db.query('SELECT * FROM legacy_accounts ORDER BY id')).rows,[{id:'historical-a',role:'learner'},{id:'historical-b',role:'admin'}]);
  });
 }finally{await db.close();}
});
