import './i18n/browser.ts';
import './identity-client.ts';
import {locale,status,text} from './i18n/browser.ts';
import {route} from './i18n/core.ts';
const root=document.documentElement;
const themeButton=document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
function updateThemeButton(){if(themeButton){const dark=root.dataset.theme==='dark';themeButton.setAttribute('aria-pressed',String(dark));themeButton.setAttribute('aria-label',text(dark?'nav.themeLight':'nav.themeDark'));}}
try{root.dataset.theme=localStorage.getItem('worlds-theme')??(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');}catch{root.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
updateThemeButton();
themeButton?.addEventListener('click',()=>{root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('worlds-theme',root.dataset.theme);}catch{/* Theme works without storage. */}updateThemeButton();});
document.addEventListener('worlds:locale',updateThemeButton);
const filters=[...document.querySelectorAll<HTMLButtonElement>('[data-filter]')];
const cards=[...document.querySelectorAll<HTMLElement>('[data-interests]')];
const interest:Record<string,string>={play:'spielen',learn:'lernen',create:'kreativ'};
let activeFilter='all';
function applyFilter(){for(const card of cards)card.hidden=activeFilter!=='all'&&!card.dataset.interests?.split(' ').includes(interest[activeFilter]??activeFilter);const count=document.querySelector<HTMLElement>('[data-count]');if(count)status(count,'filter.count',{count:cards.filter(card=>!card.hidden).length,total:cards.length});}
for(const button of filters)button.addEventListener('click',()=>{activeFilter=button.dataset.filter??'all';filters.forEach(candidate=>candidate.setAttribute('aria-pressed',String(candidate===button)));applyFilter();});
document.addEventListener('worlds:locale',()=>{if(activeFilter!=='all')applyFilter();});

const loginForms=document.querySelectorAll<HTMLFormElement>('[data-auth-login]');
const logoutForms=document.querySelectorAll<HTMLFormElement>('[data-auth-logout]');
function localizeAuthActions(){
 const language=locale();
 for(const form of loginForms)form.action='/auth/login?'+new URLSearchParams({next:route('account',language),ui_locales:language});
 for(const form of logoutForms)form.action='/auth/logout?'+new URLSearchParams({locale:language});
}
localizeAuthActions();
document.addEventListener('worlds:locale',localizeAuthActions);

// Fetch the same-origin POST first, then perform a normal top-level OIDC navigation.
// This avoids a form redirect across hosts; credentials remain server-side.
for(const form of loginForms)form.addEventListener('submit',async event=>{
 event.preventDefault();const button=form.querySelector<HTMLButtonElement>('button')!,message=form.querySelector<HTMLElement>('[data-auth-message]')!;
 if(button.disabled)return;button.disabled=true;status(message,'status.opening');
 try{const response=await fetch(form.action,{method:'POST',headers:{accept:'application/json'},signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error();const result=await response.json() as {url:string};const url=new URL(result.url);if(url.protocol!=='https:')throw new Error();location.assign(url.href);}
 catch{status(message,'error.authUnavailable');button.disabled=false;}
});
