import {importJWK, jwtVerify} from 'jose';
import {boundedBody} from '../packages/auth/oidc.ts';
import {migrationReceiptType} from '../packages/auth/migration-receipts.ts';
import {sessionEventPublicKey} from '../packages/auth/session-revocation.ts';
import {projects, type Project} from './projects.ts';

type ProjectId = Project['id'];
type ReceiptState = 'confirmed' | 'revoked';
type ProjectKey = NonNullable<ReturnType<typeof sessionEventPublicKey>>;
export type MigrationStatus = Partial<Record<ProjectId, ReceiptState>>;
export interface MigrationConfig {
  origin:string;
  identityIssuer:string;
  keys:Partial<Record<ProjectId, ProjectKey>>;
  db:D1Database;
}
export interface MigrationEnv {MIGRATION_RECEIPTS_ENABLED?:string; MIGRATION_RECEIPT_KEYS?:string}
const prefix='/api/migrations/receipts/';

export function migrationConfig(env:MigrationEnv,origin:string,issuer:string|undefined,db:D1Database|undefined):MigrationConfig|null {
  if(env.MIGRATION_RECEIPTS_ENABLED!=='true'||!issuer||!db||!env.MIGRATION_RECEIPT_KEYS)return null;
  try {
    const value:unknown=JSON.parse(env.MIGRATION_RECEIPT_KEYS);
    if(!value||typeof value!=='object'||Array.isArray(value))return null;
    const keys:MigrationConfig['keys']={};
    for(const [id,raw] of Object.entries(value)){
      const project=projects.find(project=>project.id===id&&project.url);
      const key=sessionEventPublicKey(JSON.stringify(raw));
      if(!project||!key)return null;
      keys[project.id]=key;
    }
    const publicKeys=Object.values(keys).map(key=>key.x);
    return publicKeys.length&&new Set(publicKeys).size===publicKeys.length?{origin,identityIssuer:issuer,keys,db}:null;
  }catch{return null;}
}

export async function readMigrationStatus(config:MigrationConfig,subject:string):Promise<MigrationStatus> {
  const {results}=await config.db.prepare('SELECT project, state FROM migration_receipts WHERE identity_issuer = ? AND subject = ?')
    .bind(config.identityIssuer,subject).all<{project:ProjectId;state:ReceiptState}>();
  return Object.fromEntries(results.map(row=>[row.project,row.state])) as MigrationStatus;
}

export async function receiveMigrationReceipt(request:Request,config:MigrationConfig) {
  const url=new URL(request.url);
  const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
  const project=projects.find(project=>prefix+project.id===url.pathname);
  const pinned=project&&config.keys[project.id];
  if(url.origin!==config.origin||url.search||!project?.url||!pinned)return json({error:'NOT_FOUND'},404);
  if(request.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
  if(request.headers.get('content-type')!=='application/jwt')return json({error:'JWT_REQUIRED'},415);

  let verified:Awaited<ReturnType<typeof jwtVerify>>;
  try{
    const raw=await boundedBody(request,4096);
    verified=await jwtVerify(raw,await importJWK(pinned,'EdDSA'),{
      algorithms:['EdDSA'],typ:migrationReceiptType,issuer:new URL(project.url).origin,
      audience:config.origin+url.pathname,maxTokenAge:'5m',clockTolerance:5,
      requiredClaims:['sub','iat','exp']
    });
  }catch{return json({error:'INVALID_RECEIPT'},401);}

  const {payload,protectedHeader}=verified;
  const {sub,iat,exp,identity_issuer,account_ref,revision,state}=payload;
  if(protectedHeader.kid!==pinned.kid||payload.aud!==config.origin+url.pathname||typeof sub!=='string'||sub.length<1||sub.length>512||
     typeof iat!=='number'||typeof exp!=='number'||exp<=iat||exp-iat>300||identity_issuer!==config.identityIssuer||
     typeof account_ref!=='string'||!/^[a-f0-9]{64}$/.test(account_ref)||
     typeof revision!=='number'||!Number.isSafeInteger(revision)||revision<1||
     (state!=='confirmed'&&state!=='revoked'))return json({error:'INVALID_RECEIPT'},400);

  // The project owns the original mapping. This table only records signed
  // evidence of committed changes and does not participate in authorization.
  try{
    const written=await config.db.prepare(`
      INSERT OR IGNORE INTO migration_receipts (project,identity_issuer,subject,account_ref,revision,state,recorded_at)
      VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(project,identity_issuer,subject) DO UPDATE SET
        revision=excluded.revision,state=excluded.state,recorded_at=excluded.recorded_at
      WHERE account_ref=excluded.account_ref AND revision<excluded.revision
    `).bind(project.id,config.identityIssuer,sub,account_ref,revision,state,Date.now()).run();
    if(written.meta.changes)return json({result:'stored'});
    const previous=await config.db.prepare(`
      SELECT account_ref, revision, state FROM migration_receipts
      WHERE project=? AND identity_issuer=? AND subject=?
    `).bind(project.id,config.identityIssuer,sub).first<{account_ref:string;revision:number;state:ReceiptState}>();
    if(previous?.account_ref===account_ref){
      if(previous.revision>revision)return json({result:'stale'});
      if(previous.revision===revision&&previous.state===state)return json({result:'duplicate'});
    }
    return json({error:'RECEIPT_CONFLICT'},409);
  }catch{return json({error:'MIGRATION_STORE_UNAVAILABLE'},503);}
}
