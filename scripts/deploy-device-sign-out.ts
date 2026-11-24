import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createPrivateKey,createPublicKey} from 'node:crypto';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename,join} from 'node:path';
import ts from 'typescript';
import {sessionEventContentType,sessionEventPublicKey,sessionRevocationPath} from '../packages/auth/session-revocation.ts';
import {parseDeviceSignOutPilot} from '../src/identity.ts';
import {pilotSessionServices,productionSessionServices} from '../src/project-session-events.ts';

const args=process.argv.slice(2);
assert.ok(args.every(arg=>arg==='--dry-run'||arg==='--production')&&new Set(args).size===args.length,'Unknown sign-out deployment argument');
const dryRun=args.includes('--dry-run');
const production=args.includes('--production');
if(!dryRun){
  assert.equal(process.env.GITHUB_REPOSITORY,'manuelk2607/Worlds-Hub');
  assert.equal(process.env.GITHUB_REF,'refs/heads/main');
}
const pilot=parseDeviceSignOutPilot(process.env.IDENTITY_DEVICE_SIGN_OUT_PILOT);
assert.ok(production||pilot,'A subject and future expiry are required for pilot activation');
const rawKey=process.env.WORLDS_SESSION_EVENT_PRIVATE_JWK;
try{
  const {d,...publicFields}=JSON.parse(rawKey??'null');
  const publicKey=sessionEventPublicKey(JSON.stringify(publicFields));
  assert.ok(publicKey&&typeof d==='string');
  const privateKey=createPrivateKey({key:{...publicKey,d},format:'jwk'});
  assert.equal(createPublicKey(privateKey).export({format:'jwk'}).x,publicKey.x);
}catch{
  throw new Error('The sign-out signing key must be a matching Ed25519 JWK');
}
const services=production?productionSessionServices:pilotSessionServices;
if(production&&!dryRun){
  await Promise.all(services.map(async ({service})=>{
    const response=await fetch(`https://${service}.maki26.workers.dev${sessionRevocationPath}`,{
      method:'POST',redirect:'manual',signal:AbortSignal.timeout(5000),
      headers:{'content-type':sessionEventContentType},body:'unsigned-release-readiness-check',
    });
    assert.equal(response.status,400,`${service} sign-out receiver is inactive or did not reject an unsigned request`);
    assert.deepEqual(await response.json(),{err:'invalid_request'});
  }));
}
const temporary=mkdtempSync(join(tmpdir(),'worlds-hub-sign-out-'));
const configFile=`.${basename(temporary)}.json`;
try{
  const config=ts.parseConfigFileTextToJson('wrangler.jsonc',readFileSync('wrangler.jsonc','utf8'));
  assert.ok(!config.error&&config.config.name==='worlds-hub','Invalid Hub configuration');
  const bindings=production?[...services,{binding:'IT_WORLDS_MIGRATION_TASK',service:'it-worlds',entrypoint:'MigrationReceiptDelivery'}]:services;
  writeFileSync(configFile,JSON.stringify({...config.config,services:bindings}),{mode:0o600,flag:'wx'});
  const file=join(temporary,'secrets.json');
  writeFileSync(file,JSON.stringify({
    ...(production?{}:{IDENTITY_DEVICE_SIGN_OUT_PILOT:JSON.stringify(pilot)}),
    WORLDS_SESSION_EVENT_PRIVATE_JWK:rawKey,
  }),{mode:0o600});
  const result=spawnSync(process.execPath,[
    'node_modules/wrangler/bin/wrangler.js','deploy','--config',configFile,'--name','worlds-hub',
    '--var',`IDENTITY_DEVICE_SIGN_OUT_ENABLED:${production?'true':'pilot'}`,'--secrets-file',file,
    ...(dryRun?['--dry-run']:[]),
  ],{stdio:'inherit'});
  if(result.error)throw result.error;
  process.exitCode=result.status??1;
}finally{
  rmSync(configFile,{force:true});
  rmSync(temporary,{recursive:true,force:true});
}
