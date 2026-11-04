import de from './de.json' with {type:'json'};
import en from './en.json' with {type:'json'};

export const locales=['de','en'] as const;
export type Locale=typeof locales[number];
export type MessageKey=keyof typeof de;
export type Values=Record<string,string|number>;
export const messages:Record<Locale,Record<MessageKey,string>>={de,en};
export const LOCALE_COOKIE='__Host-worlds-locale';
export const LOCALE_STORAGE_KEY='worlds.locale';
export const localeTags:Record<Locale,string>={de:'de-DE',en:'en-GB'};

export function normalizeLocale(value:unknown):Locale|null {
 if(typeof value!=='string')return null;
 const language=value.trim().toLowerCase().split(/[-_]/)[0];
 return language==='de'||language==='en'?language:null;
}
export function isMessageKey(value:string):value is MessageKey{return Object.hasOwn(de,value);}
export function browserLocale(header:string|null|undefined):Locale {
 const choices=(header??'').split(',').map((part,index)=>{
  const [language,...parameters]=part.trim().split(';');
  const quality=parameters.find(p=>p.trim().startsWith('q='));
  const q=quality?Number(quality.trim().slice(2)):1;
  return {locale:normalizeLocale(language),q:Number.isFinite(q)&&q>=0&&q<=1?q:0,index};
 }).filter(c=>c.locale&&c.q>0).sort((a,b)=>b.q-a.q||a.index-b.index);
 return choices[0]?.locale??'de';
}
export function cookieLocale(request:Request):Locale|null {
 const values=(request.headers.get('cookie')??'').split(';').map(c=>c.trim()).filter(c=>c.startsWith(LOCALE_COOKIE+'='));
 if(values.length!==1)return null;
 const value=values[0].slice(LOCALE_COOKIE.length+1);
 return value==='de'||value==='en'?value:null;
}
export function requestLocale(request:Request):Locale {
 const url=new URL(request.url);
 const hint=(url.searchParams.get('ui_locales')??'').split(' ').map(normalizeLocale).find(Boolean);
 return cookieLocale(request)??hint??browserLocale(request.headers.get('accept-language'));
}
export function routeLocale(request:Request):Locale {
 const match=matchRoute(new URL(request.url).pathname);
 return match?.locale??requestLocale(request);
}
export function languageCookie(locale:Locale){return `${LOCALE_COOKIE}=${locale}; Path=/; Secure; SameSite=Lax; Max-Age=31536000`;}
export function t(locale:Locale,key:MessageKey,values:Values={}):string {
 return messages[locale][key].replace(/\{([A-Za-z0-9_]+)\}/g,(placeholder,name:string)=>{
  const value=values[name];return value===undefined?placeholder:typeof value==='number'?new Intl.NumberFormat(localeTags[locale]).format(value):value;
 });
}
export function dateTime(value:string|number,locale:Locale,timeZone?:string){
 const date=new Date(value);if(!Number.isFinite(date.getTime()))return '—';
 return new Intl.DateTimeFormat(localeTags[locale],{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short',...(timeZone?{timeZone}:{})}).format(date);
}

export const routes={
 home:{de:'/',en:'/en/'},
 account:{de:'/konto',en:'/en/account'},
 signIn:{de:'/anmelden',en:'/en/sign-in'},
 signUp:{de:'/registrieren',en:'/en/sign-up'},
 signedOut:{de:'/abgemeldet',en:'/en/signed-out'},
 privacy:{de:'/datenschutz',en:'/en/privacy'},
 'world:music-worlds':{de:'/welten/music-worlds',en:'/en/worlds/music-worlds'},
 'world:sprachwelten':{de:'/welten/sprachwelten',en:'/en/worlds/sprachwelten'},
 'world:it-worlds':{de:'/welten/it-worlds',en:'/en/worlds/it-worlds'},
 'world:slop-urself':{de:'/welten/slop-urself',en:'/en/worlds/slop-urself'},
} as const;
export type RouteId=keyof typeof routes;
export function isRouteId(value:string):value is RouteId{return Object.hasOwn(routes,value);}
export function route(id:RouteId,locale:Locale){return routes[id][locale];}
export function matchRoute(path:string):{id:RouteId;locale:Locale;canonical:string}|null {
 for(const id of Object.keys(routes) as RouteId[])for(const locale of locales){
  const canonical=route(id,locale);
  if(path===canonical||(canonical!=='/'&&path.replace(/\/$/,'')===canonical.replace(/\/$/,'')))return {id,locale,canonical};
 }
 return null;
}
export const publicRouteIds:readonly RouteId[]=['home','world:music-worlds','world:sprachwelten','world:it-worlds','world:slop-urself'];
