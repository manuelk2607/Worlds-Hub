import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createPrivateKey,createPublicKey} from 'node:crypto';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sessionEventPublicKey} from '../packages/auth/session-revocation.ts';
import {parseDeviceSignOutPilot} from '../src/identity.ts';

const args=process.argv.slice(2);
const dryRun=args.length===1&&args[0]==='--dry-run';
assert.ok(!args.length||dryRun,'Unknown pilot deployment argument');
if(!dryRun){
  assert.equal(process.env.GITHUB_REPOSITORY,'manuelk2607/Worlds-Hub');
  assert.equal(process.env.GITHUB_REF,'refs/heads/main');
}
const pilot=parseDeviceSignOutPilot(process.env.IDENTITY_DEVICE_SIGN_OUT_PILOT);
assert.ok(pilot,'A subject and future expiry are required for pilot activation');
const rawKey=process.env.WORLDS_SESSION_EVENT_PRIVATE_JWK;
try{
  const {d,...publicFields}=JSON.parse(rawKey??'null');
  const publicKey=sessionEventPublicKey(JSON.stringify(publicFields));
  assert.ok(publicKey&&typeof d==='string');
  const privateKey=createPrivateKey({key:{...publicKey,d},format:'jwk'});
  assert.equal(createPublicKey(privateKey).export({format:'jwk'}).x,publicKey.x);
}catch{
  throw new Error('The pilot signing key must be a matching Ed25519 JWK');
}
const temporary=mkdtempSync(join(tmpdir(),'worlds-hub-pilot-'));
try{
  const file=join(temporary,'secrets.json');
  writeFileSync(file,JSON.stringify({
    IDENTITY_DEVICE_SIGN_OUT_PILOT:JSON.stringify(pilot),
    WORLDS_SESSION_EVENT_PRIVATE_JWK:rawKey,
  }),{mode:0o600});
  const result=spawnSync(process.execPath,[
    'node_modules/wrangler/bin/wrangler.js','deploy','--name','worlds-hub',
    '--var','IDENTITY_DEVICE_SIGN_OUT_ENABLED:pilot','--secrets-file',file,
    ...(dryRun?['--dry-run']:[]),
  ],{stdio:'inherit'});
  if(result.error)throw result.error;
  process.exitCode=result.status??1;
}finally{
  rmSync(temporary,{recursive:true,force:true});
}
