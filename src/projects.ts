import type {Locale} from './i18n/core.ts';

export interface Project { id:'music-worlds'|'sprachwelten'|'it-worlds'|'slop-urself'; name:string; url:string|null; englishPath?:string; accountPaths:Record<Locale,string>; color:'purple'|'orange'|'blue'|'green'; number:string }
export const projects:readonly Project[] = [
  {id:'music-worlds',name:'Music-Worlds',url:'https://music-worlds.maki26.workers.dev/',
   englishPath:'/en',accountPaths:{de:'/#profil',en:'/en#profil'},color:'purple',number:'01'},
  {id:'sprachwelten',name:'Sprachwelten',url:'https://sprachwelten.maki26.workers.dev/',
   englishPath:'/en',accountPaths:{de:'/auth/worlds',en:'/auth/worlds-en'},color:'orange',number:'02'},
  {id:'it-worlds',name:'IT-Worlds',url:'https://it-worlds.maki26.workers.dev/',
   englishPath:'/en/',accountPaths:{de:'/konto/',en:'/en/konto/'},color:'blue',number:'03'},
  {id:'slop-urself',name:'Slop Urself',url:'https://slopurself.maki26.workers.dev/',
   accountPaths:{de:'/auth/worlds?ui_locales=de',en:'/auth/worlds?ui_locales=en'},color:'green',number:'04'},
];

export function projectUrl(project:Project,locale:Locale,section:'home'|'account'='home'){
 if(!project.url)return null;
 const path=section==='account'?project.accountPaths[locale]:locale==='en'?project.englishPath:undefined;
 return path?new URL(path,project.url).href:project.url;
}
export const escapeHtml = (s:string) => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
