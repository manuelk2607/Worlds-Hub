import {createInterface} from 'node:readline';
import {beginNativeAdminQa,ADMIN_QA_ISSUER} from './lib/native-admin-qa.ts';
// Run only after explicit approval of three new fixtures, one temporary admin
// role and deletion of exactly those three fixtures by the official management.
if(process.argv[2]!=='--approved-three-fixture-probe'||process.argv.length!==3)throw new Error('Explicit bounded QA approval is required');
const emit=(value:unknown)=>process.stdout.write(JSON.stringify(value)+'\n');
const commands=createInterface({input:process.stdin,terminal:false});
let closed=false;
try{
 const probe=await beginNativeAdminQa(value=>emit({stage:'created',...value}));
 emit({stage:'awaiting-approved-role',issuer:ADMIN_QA_ISSUER,ids:probe.ids});
 for await(const command of commands){
  if(command==='probe'){try{emit({stage:'result',...await probe.probe()});}catch{emit({stage:'result',error:'QA_PROBE_FAILED'});}}
  else if(command==='cleanup'){emit({stage:'cleanup',...await probe.cleanup()});closed=true;break;}
  else emit({stage:'refused',error:'UNKNOWN_COMMAND'});
 }
 if(!closed){emit({stage:'cleanup',...await probe.cleanup()});closed=true;}
}catch{emit({stage:'failed',error:'QA_SETUP_FAILED'});process.exitCode=1;}
finally{commands.close();}
