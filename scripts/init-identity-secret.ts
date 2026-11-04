/** Explicit CI-only initialization. Never prints or persists the generated signing key. */
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {resolve} from 'node:path';
if(process.env.GITHUB_ACTIONS!=='true'||process.env.INITIALIZE_IDENTITY_SECRET!=='true')throw new Error('Explicit CI initialization required');
if(!process.env.CLOUDFLARE_API_TOKEN)throw new Error('Cloudflare deployment secret missing');
const cli=resolve('node_modules/wrangler/bin/wrangler.js');
const listing=spawnSync(process.execPath,[cli,'secret','list','--name','worlds-hub','--format','json'],{encoding:'utf8'});
if(listing.status!==0)throw new Error('Cannot verify existing secrets; initialization aborted');
const entries=JSON.parse(listing.stdout) as {name:string}[];
if(!Array.isArray(entries))throw new Error('Invalid secret listing; initialization aborted');
if(entries.some(e=>e.name==='IDENTITY_COOKIE_SECRET'))console.log('Identity signing secret already exists; preserved.');
else {
 const key=randomBytes(48).toString('base64');
 const result=spawnSync(process.execPath,[cli,'secret','put','IDENTITY_COOKIE_SECRET','--name','worlds-hub'],{input:key,encoding:'utf8'});
 if(result.status!==0)throw new Error('Identity signing secret initialization failed');
 console.log('Identity signing secret stored in Cloudflare; value never logged or saved locally.');
}
