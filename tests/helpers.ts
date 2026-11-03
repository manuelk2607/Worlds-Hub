import { generateKeyPair,exportJWK,SignJWT } from 'jose';
import * as oauth from 'oauth4webapi';
import { hash,type AuthStore,type Session,type Transaction } from '../packages/auth/store.ts';
import type { AuthConfig } from '../packages/auth/oidc.ts';
export class MemoryStore implements AuthStore {
  transactions=new Map<string,Transaction>();sessions=new Map<string,Session>();replays=new Set<string>();
  async putTransaction(k:string,v:Transaction){this.transactions.set(k,v);}
  async takeTransaction(k:string){const v=this.transactions.get(k)??null;this.transactions.delete(k);return v;}
  async putSession(k:string,v:Session){this.sessions.set(k,v);}
  async getSession(k:string){return this.sessions.get(k)??null;}
  async deleteSession(k:string){this.sessions.delete(k);}
  async revokeIdentity(issuer:string,sub?:string,sid?:string){for(const [k,v] of this.sessions)if(v.issuer===issuer&&(!sub||v.sub===sub)&&(!sid||v.sid===sid))this.sessions.delete(k);}
  async claimReplay(k:string){if(this.replays.has(k))return false;this.replays.add(k);return true;}
}
export const cookieHeader=(response:Response)=>response.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
export async function provider() {
  const keys=await generateKeyPair('RS256',{extractable:true}),wrong=await generateKeyPair('RS256',{extractable:true});
  const jwk=await exportJWK(keys.publicKey);jwk.kid='test';jwk.alg='RS256';jwk.use='sig';
  const issuer='https://identity.test';
  const as={issuer,authorization_endpoint:issuer+'/authorize',token_endpoint:issuer+'/token',jwks_uri:issuer+'/jwks',userinfo_endpoint:issuer+'/userinfo',response_types_supported:['code'],subject_types_supported:['public'],id_token_signing_alg_values_supported:['RS256'],code_challenge_methods_supported:['S256']};
  const codes=new Map<string,{aud:string;nonce:string;redirect:string;resource:string|null;challenge:string}>();
  let centralCookie=false,passwordPrompts=0;
  let overrides:Record<string,unknown>={},userInfoOverrides:Record<string,unknown>={},invalidSignature=false;
  const api={
    as,
    config:(origin='https://hub.test',clientId='hub'):AuthConfig=>({issuer,origin,clientId,algorithm:'RS256',store:new MemoryStore()}),
    authorize(location:string){const url=new URL(location);if(!centralCookie){passwordPrompts++;centralCookie=true;}const code=oauth.generateRandomState();codes.set(code,{aud:url.searchParams.get('client_id')!,nonce:url.searchParams.get('nonce')!,redirect:url.searchParams.get('redirect_uri')!,resource:url.searchParams.get('resource'),challenge:url.searchParams.get('code_challenge')!});const callback=new URL(url.searchParams.get('redirect_uri')!);callback.search=new URLSearchParams({code,state:url.searchParams.get('state')!}).toString();return callback;},
    override(v:Record<string,unknown>,badSignature=false){overrides=v;invalidSignature=badSignature;},
    userinfo(v:Record<string,unknown>){userInfoOverrides=v;},
    prompts:()=>passwordPrompts,
    async logoutToken(sub='user-1',sid='idp-session',extra:Record<string,unknown>={}) {return new SignJWT({iss:issuer,aud:'hub',iat:Math.floor(Date.now()/1000),sub,sid,events:{'http://schemas.openid.net/event/backchannel-logout':{}},...extra}).setProtectedHeader({alg:'RS256',kid:'test'}).setJti(oauth.generateRandomState()).setExpirationTime('2m').sign(keys.privateKey);},
    async fetch(input:RequestInfo|URL,init?:RequestInit) {
      const url=new URL(input instanceof Request?input.url:String(input));
      if(url.origin!==issuer)throw new Error('Unexpected external request: '+url.origin);
      if(url.pathname==='/.well-known/openid-configuration')return Response.json(as);
      if(url.pathname==='/userinfo'){if(new Headers(init?.headers).get('authorization')!=='Bearer server-only-access')return new Response(null,{status:401});return Response.json({sub:'user-1',name:'Test Person',email:'person@example.test',email_verified:true,...userInfoOverrides});}
      if(url.pathname==='/jwks')return Response.json({keys:[jwk]});
      if(url.pathname==='/token') {
        const params=new URLSearchParams(init?.body as URLSearchParams);const record=codes.get(params.get('code')??'');codes.delete(params.get('code')??'');
        if(!record||record.challenge!==await oauth.calculatePKCECodeChallenge(params.get('code_verifier')??'')||record.redirect!==params.get('redirect_uri')||record.aud!==(params.get('client_id')??atob((new Headers(init?.headers).get('authorization')??'').slice(6)).split(':')[0])||record.resource!==params.get('resource'))return Response.json({error:'invalid_grant'},{status:400});
        const now=Math.floor(Date.now()/1000);
        const idToken=await new SignJWT({iss:issuer,sub:'user-1',aud:record.aud,nonce:record.nonce,email:'person@example.test',email_verified:true,name:'Test Person',sid:'idp-session',iat:now,exp:now+3600,...overrides}).setProtectedHeader({alg:'RS256',kid:'test'}).sign(invalidSignature?wrong.privateKey:keys.privateKey);
        return Response.json({access_token:'server-only-access',refresh_token:'server-only-refresh',id_token:idToken,token_type:'Bearer',expires_in:3600});
      }
      throw new Error('Unexpected endpoint: '+url.pathname);
    },
    async seed(config:AuthConfig,raw=oauth.generateRandomState()){const value={issuer,sub:'user-1',sid:'idp-session',csrf:oauth.generateRandomState(),expires:Date.now()+60_000};await config.store.putSession(await hash(raw),value);return {raw,value};}
  };return api;
}
