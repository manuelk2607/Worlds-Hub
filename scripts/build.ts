import { build } from 'esbuild';
import { readFile,mkdir,copyFile,rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const clientBuild=await build({entryPoints:['src/client.ts'],bundle:true,write:false,format:'iife',minify:true,target:'es2022'});
const client={code:clientBuild.outputFiles[0].text};
// Hash only the structured metadata script. CSP permits no arbitrary inline JavaScript.
// JSON-LD is data; browsers still enforce script-src for this script element.
const {projects}=await import('../src/projects.ts');
const origin=process.env.SITE_ORIGIN??'https://worlds-hub.maki26.workers.dev';
const description='Entdecke Music-Worlds, Sprachwelten, IT-Worlds und Slop Urself. Dein zentraler Einstieg in vier eigenständige Welten.';
const schema=JSON.stringify({'@context':'https://schema.org','@type':'WebSite',name:'Worlds Hub',url:origin+'/',description,hasPart:projects.filter(p=>p.url).map(p=>({'@type':'WebSite',name:p.name,url:p.url}))}).replace(/</g,'\\u003c');
const hash=createHash('sha256').update(schema).digest('base64');
await rm('dist',{recursive:true,force:true});await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await build({entryPoints:['src/worker.ts'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:false,plugins:[{name:'browser-script',setup(b){b.onResolve({filter:/\?raw$/},()=>({path:'client',namespace:'client'}));b.onLoad({filter:/.*/,namespace:'client'},()=>({contents:`export default ${JSON.stringify(client.code)}`,loader:'js'}));b.onLoad({filter:/worker\.ts$/},async args=>({contents:(await readFile(args.path,'utf8')).replace('sha256-PLACEHOLDER','sha256-'+hash),loader:'ts'}));}}]});
await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Built Cloudflare Worker (including browser assets).');
