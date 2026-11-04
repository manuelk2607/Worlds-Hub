import {LOCALE_COOKIE,LOCALE_STORAGE_KEY,isMessageKey,localeTags,normalizeLocale,route,routes,t,type Locale,type MessageKey,type Values} from './core.ts';

let current:Locale=normalizeLocale(document.documentElement.lang)??'de';
export const locale=()=>current;
export const text=(key:MessageKey,values:Values={})=>t(current,key,values);

function valuesFor(element:HTMLElement):Values {
 try {const value=element.dataset.i18nValues;return value?JSON.parse(value) as Values:{};}catch{return {};}
}
function setAttributeTranslations(element:HTMLElement){
 for(const name of ['aria-label','title','placeholder','content'] as const){
  const key=element.getAttribute('data-i18n-'+name);
  if(key&&isMessageKey(key))element.setAttribute(name,t(current,key,valuesFor(element)));
 }
}
export function applyLocale(next:Locale,{persist=false,announce=false,replaceUrl=true}={}){
 current=next;document.documentElement.lang=next;document.documentElement.dataset.locale=next;
 document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(element=>{const key=element.dataset.i18n;if(key&&isMessageKey(key))element.textContent=t(next,key,valuesFor(element));});
 document.querySelectorAll<HTMLElement>('[data-i18n-aria-label],[data-i18n-title],[data-i18n-placeholder],[data-i18n-content]').forEach(setAttributeTranslations);
 document.querySelectorAll<HTMLAnchorElement>('[data-route]').forEach(anchor=>{const id=anchor.dataset.route;if(id&&Object.hasOwn(routes,id)){const hash=anchor.dataset.routeHash??'';anchor.href=route(id as keyof typeof routes,next)+hash;}});
 document.querySelectorAll<HTMLButtonElement>('[data-locale]').forEach(button=>{const active=button.dataset.locale===next;button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-current',active?'true':'false');});
 const og=document.querySelector<HTMLMetaElement>('meta[property="og:locale"]');if(og)og.content=next==='de'?'de_DE':'en_GB';
 if(replaceUrl){const id=document.body.dataset.route;if(id&&Object.hasOwn(routes,id)){const path=route(id as keyof typeof routes,next),target=path+location.search+location.hash;if(target!==location.pathname+location.search+location.hash)history.replaceState(history.state,'',target);const canonical=document.querySelector<HTMLLinkElement>('link[rel="canonical"]');if(canonical)canonical.href=location.origin+path;const ogUrl=document.querySelector<HTMLMetaElement>('meta[property="og:url"]');if(ogUrl)ogUrl.content=location.origin+path;const schema=document.querySelector<HTMLScriptElement>('script[type="application/ld+json"]');if(schema){try{const value=JSON.parse(schema.textContent??'{}') as Record<string,unknown>;value.url=location.origin+path;value.inLanguage=next;value.description=t(next,'meta.description');schema.textContent=JSON.stringify(value);}catch{/* Invalid third-party metadata is left unchanged. */}}}}
 if(persist){try{localStorage.setItem(LOCALE_STORAGE_KEY,next);}catch{/* Cookie remains the durable fallback. */}document.cookie=`${LOCALE_COOKIE}=${next}; Path=/; Secure; SameSite=Lax; Max-Age=31536000`;void saveProfileLocale(next);}
 if(announce){const status=document.querySelector<HTMLElement>('[data-locale-status]');if(status)status.textContent=t(next,'locale.changed',{language:t(next,next==='de'?'locale.de':'locale.en')});}
 document.dispatchEvent(new CustomEvent('worlds:locale',{detail:{locale:next}}));
}

async function saveProfileLocale(next:Locale){
 try{const response=await fetch('/api/preferences/locale',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({locale:next}),signal:AbortSignal.timeout(5000)});if(!response.ok&&response.status!==401)throw new Error();}catch{/* Local preference remains active if profile storage is unavailable. */}
}
export function status(element:HTMLElement,key:MessageKey,values:Values={}){element.dataset.statusKey=key;element.dataset.statusValues=JSON.stringify(values);element.textContent=t(current,key,values);}
export function clearStatus(element:HTMLElement){delete element.dataset.statusKey;delete element.dataset.statusValues;element.textContent='';}
export function errorKey(code:unknown):MessageKey {
 const normalized=typeof code==='string'?code.toLowerCase().replace(/[^a-z0-9]+/g,'_'):'';
 const map:Record<string,MessageKey>={rate_limited:'error.rateLimited',too_many_requests:'error.rateLimited',invalid_credentials:'error.invalidCredentials',invalid_email:'error.invalidEmail',email_not_verified:'error.emailNotVerified',email_already_exists:'error.emailExists',user_already_exists:'error.emailExists',password_too_short:'error.passwordShort',password_too_long:'error.passwordLong',invalid_otp:'error.invalidCode',otp_expired:'error.invalidCode',invalid_token:'error.invalidLink',token_expired:'error.invalidLink',signup_disabled:'error.signupDisabled',invalid_request:'error.invalidRequest',identity_unavailable:'error.identityUnavailable',rate_limit_unavailable:'error.identityUnavailable'};
 return map[normalized]??'error.tryAgain';
}
export const errorText=(code:unknown)=>t(current,errorKey(code));

for(const button of document.querySelectorAll<HTMLButtonElement>('[data-locale]'))button.addEventListener('click',()=>{const next=normalizeLocale(button.dataset.locale);if(next)applyLocale(next,{persist:true,announce:true});});
document.addEventListener('worlds:locale',()=>{document.querySelectorAll<HTMLElement>('[data-status-key]').forEach(element=>{const key=element.dataset.statusKey;if(key&&isMessageKey(key)){let values:Values={};try{values=JSON.parse(element.dataset.statusValues??'{}') as Values;}catch{/* Ignore malformed local state. */}element.textContent=t(current,key,values);}});});
let localPreference:Locale|null=null;try{localPreference=normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY));if(localPreference){document.cookie=`${LOCALE_COOKIE}=${localPreference}; Path=/; Secure; SameSite=Lax; Max-Age=31536000`;if(localPreference!==current)applyLocale(localPreference,{replaceUrl:true});}}catch{/* Server locale remains active. */}
if(!localPreference)void fetch('/api/preferences/locale',{headers:{accept:'application/json'},signal:AbortSignal.timeout(5000)}).then(async response=>{if(!response.ok)return;const data=await response.json() as {locale?:unknown};const preferred=normalizeLocale(data.locale);if(preferred){try{localStorage.setItem(LOCALE_STORAGE_KEY,preferred);}catch{/* Cookie/profile still preserve the choice. */}if(preferred!==current)applyLocale(preferred,{replaceUrl:true});}}).catch(()=>{/* Guest and offline visits keep the negotiated language. */});

export function formatDates(){document.querySelectorAll<HTMLElement>('[data-date]').forEach(element=>{const date=new Date(element.dataset.date??'');if(Number.isFinite(date.getTime()))element.textContent=new Intl.DateTimeFormat(localeTags[current],{dateStyle:'medium',timeStyle:'short'}).format(date);});}
formatDates();document.addEventListener('worlds:locale',formatDates);
