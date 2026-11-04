import {escapeHtml as e} from '../html.ts';
import {t,route,type Locale,type MessageKey,type Values,type RouteId} from './core.ts';
export function translated(locale:Locale,key:MessageKey,values:Values={}){
 return `<span data-i18n="${key}"${Object.keys(values).length?` data-i18n-values="${e(JSON.stringify(values))}"`:''}>${e(t(locale,key,values))}</span>`;
}
export function translatedAttribute(locale:Locale,name:'aria-label'|'title'|'placeholder'|'content',key:MessageKey,values:Values={}){
 return `data-i18n-${name}="${key}" ${name}="${e(t(locale,key,values))}"${Object.keys(values).length?` data-i18n-values="${e(JSON.stringify(values))}"`:''}`;
}
export function link(locale:Locale,id:RouteId,hash=''){
 return `data-route="${id}"${hash?` data-route-hash="${e(hash)}"`:''} href="${route(id,locale)+e(hash)}"`;
}
