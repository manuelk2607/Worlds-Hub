/** Local browser QA only. This harness never contacts Neon or accepts a login. */
import {createServer} from 'node:http';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {identityPage} from '../src/identity-pages.ts';
import {layout} from '../src/pages.ts';
import type {IdentityConfig} from '../src/identity.ts';
const {default:worker}=await import(pathToFileURL(resolve('dist/server/index.js')).href);
const port=Number(process.env.PORT??4174);
const origin='http://127.0.0.1:'+port;
const config:Pick<IdentityConfig,'origin'|'clients'>={origin,clients:[]};
createServer(async(req,res)=>{
 const url=new URL(req.url!,origin);
 if(url.pathname.startsWith('/api/identity/')){res.writeHead(503,{'content-type':'application/json'});res.end(JSON.stringify({error:'Lokale Oberflächenprüfung: keine echte Anmeldung.'}));return;}
 if(url.pathname.startsWith('/identity/')){const page=identityPage(url.pathname,url.search.slice(1),'local-layout-only-csrf',config);const html=layout(page.body.replace('<h1>','<p class="notice">Lokale Oberflächenprüfung · keine echte Anmeldung.</p><h1>'),{origin,path:url.pathname,title:'Lokale Identitäts-Oberflächenprüfung',description:'Lokale Layoutprüfung ohne Anmeldedienst.',indexing:false});res.writeHead(page.status,{'content-type':'text/html; charset=utf-8'});res.end(html);return;}
 const response=await worker.fetch(new Request(url),{});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port,'127.0.0.1',()=>console.log('Local identity UI QA: '+origin+'/identity/login'));
