import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {exportJWK,generateKeyPair,SignJWT} from 'jose';
import {migrationConfig,readMigrationStatus,receiveMigrationReceipt} from '../src/migration-receipts.ts';
import {account} from '../src/pages.ts';
import {sqliteD1} from './sqlite-helper.ts';

const hub='https://worlds.test',issuer='https://identity.test/auth',project='https://slopurself.maki26.workers.dev';
const path='/api/migrations/receipts/slop-urself',subject='central-test-subject';
const reference='a'.repeat(64);

test('signed project receipts survive retries and out-of-order delivery without transferring account ownership',async()=>{
  const {db,binding}=await sqliteD1();
  try{
    db.exec(await readFile('migrations/0004_migration_receipts.sql','utf8'));
    const pair=await generateKeyPair('EdDSA',{extractable:true});
    const {kty,crv,x}=await exportJWK(pair.publicKey);
    const key={kid:'fixture',kty,crv,x};
    const env={MIGRATION_RECEIPTS_ENABLED:'true',MIGRATION_RECEIPT_KEYS:JSON.stringify({'slop-urself':key})};
    const config=migrationConfig(env,hub,issuer,binding)!;
    assert.ok(config);
    assert.equal(migrationConfig({...env,MIGRATION_RECEIPTS_ENABLED:'false'},hub,issuer,binding),null);
    assert.equal(migrationConfig({...env,MIGRATION_RECEIPT_KEYS:JSON.stringify({'slop-urself':{...key,d:'private'}})},hub,issuer,binding),null);
    async function signed({revision=1,state='confirmed',accountRef=reference,sub=subject,idp=issuer,
      audience=hub+path,signer=pair.privateKey,age=0}:{
        revision?:number;state?:string;accountRef?:string;sub?:string;idp?:string;audience?:string;signer?:typeof pair.privateKey;age?:number
      }={}){
      const iat=Math.floor(Date.now()/1000)-age;
      return new SignJWT({identity_issuer:idp,account_ref:accountRef,revision,state})
        .setProtectedHeader({alg:'EdDSA',typ:'worlds-migration-receipt+jwt',kid:key.kid})
        .setIssuer(project).setAudience(audience).setSubject(sub).setIssuedAt(iat).setExpirationTime(iat+300).sign(signer);
    }
    const send=(jwt:string,url=hub+path)=>receiveMigrationReceipt(new Request(url,{method:'POST',headers:{'content-type':'application/jwt'},body:jwt}),config);
    assert.equal((await send(await signed({signer:(await generateKeyPair('EdDSA')).privateKey}))).status,401);
    assert.equal((await send(await signed({age:600}))).status,401);
    assert.equal((await send(await signed({audience:hub+'/api/migrations/receipts/it-worlds'}))).status,401);
    assert.equal((await send(await signed(),hub+'/api/migrations/receipts/it-worlds')).status,404);
    assert.equal((await send(await signed({idp:'https://foreign.test'}))).status,400);
    assert.deepEqual(await readMigrationStatus(config,subject),{});
    const valid=await signed();
    const retries=await Promise.all([send(valid),send(valid)]);
    assert.deepEqual((await Promise.all(retries.map(response=>response.json() as Promise<{result:string}>))).map(x=>x.result).sort(),['duplicate','stored']);
    assert.deepEqual(await readMigrationStatus(config,subject),{'slop-urself':'confirmed'});
    assert.deepEqual(await readMigrationStatus(config,'different-user'),{});
    assert.equal((await send(await signed({sub:'different-user'}))).status,409);
    assert.equal((await send(await signed({revision:2,accountRef:'b'.repeat(64)}))).status,409);
    assert.equal((await send(await signed({state:'revoked'}))).status,409);
    assert.equal((await send(await signed({revision:3,state:'revoked'}))).status,200);
    assert.deepEqual(await (await send(await signed({revision:2}))).json(),{result:'stale'});
    const status=await readMigrationStatus(config,subject);
    assert.deepEqual(status,{'slop-urself':'revoked'});
    const page=account({issuer,sub:subject,expires:Date.now()+60000,csrf:'test'},true,'en',undefined,true,status);
    assert.match(page,/Link revoked/);
    assert.doesNotMatch(page,new RegExp(reference+'|'+subject));
  }finally{db.close();}
});
