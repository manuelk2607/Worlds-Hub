import { build } from 'esbuild';
import { mkdir,copyFile,rm } from 'node:fs/promises';
const clientBuild=await build({entryPoints:['src/client.ts'],bundle:true,write:false,format:'iife',minify:true,target:'es2022'});
const client={code:clientBuild.outputFiles[0].text};
await rm('dist',{recursive:true,force:true});await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await build({entryPoints:['src/worker.ts'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:false,plugins:[{name:'browser-script',setup(b){b.onResolve({filter:/\?raw$/},()=>({path:'client',namespace:'client'}));b.onLoad({filter:/.*/,namespace:'client'},()=>({contents:`export default ${JSON.stringify(client.code)}`,loader:'js'}));}}]});
await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Built Cloudflare Worker (including browser assets).');
