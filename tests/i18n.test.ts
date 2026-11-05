import {test} from 'node:test';
import assert from 'node:assert/strict';
import {messages,locales,t,browserLocale,normalizeLocale,cookieLocale,requestLocale,LOCALE_COOKIE,dateTime,routes,route,matchRoute,publicRouteIds} from '../src/i18n/core.ts';
import {translated,translatedAttribute} from '../src/i18n/html.ts';

test('DE and EN catalogs cover identical keys and placeholders with no empty translations',()=>{
 assert.deepEqual(Object.keys(messages.de).sort(),Object.keys(messages.en).sort());
 for(const key of Object.keys(messages.de) as (keyof typeof messages.de)[]){
  for(const locale of locales)assert.ok(messages[locale][key].trim(),`${locale}:${key}`);
  assert.deepEqual(messages.de[key].match(/\{\w+\}/g)?.sort()??[],messages.en[key].match(/\{\w+\}/g)?.sort()??[],key);
 }
});
test('browser negotiation respects quality and supported primary languages with German fallback',()=>{
 assert.equal(browserLocale('en-US,en;q=0.9,de;q=0.8'),'en');
 assert.equal(browserLocale('en;q=0.2,de-CH;q=0.9'),'de');
 assert.equal(browserLocale('fr-FR, en-GB;q=0.5'),'en');
 for(const h of [undefined,'fr,es','*','en;q=0','en;q=2','en;q=invalid'])assert.equal(browserLocale(h),'de');
 assert.equal(normalizeLocale('EN-gb'),'en');assert.equal(normalizeLocale('fr'),null);
 const request=new Request('https://worlds.test/identity/login?ui_locales=en',{headers:{cookie:LOCALE_COOKIE+'=de','accept-language':'en'}});
 assert.equal(requestLocale(request),'de');
 assert.equal(cookieLocale(new Request(request,{headers:{cookie:`${LOCALE_COOKIE}=en; ${LOCALE_COOKIE}=de`}})),null);
});
test('localized route pairs retain German addresses and provide exact English equivalents',()=>{
 assert.equal(route('home','de'),'/');assert.equal(route('account','de'),'/konto');
 assert.equal(route('account','en'),'/en/account');assert.equal(publicRouteIds.length*locales.length,10);
 for(const id of Object.keys(routes) as (keyof typeof routes)[])for(const locale of locales)assert.equal(matchRoute(route(id,locale))?.id,id);
 assert.equal(matchRoute('/auth/callback'),null);assert.equal(matchRoute('/identity/login'),null);
});
test('formatting localizes numbers and dates without translating supplied content',()=>{
 assert.equal(t('en','account.greeting',{name:'Guten Morgen'}),'Hello, Guten Morgen.');
 assert.equal(t('en','account.greeting',{name:{key:'common.explorer'}}),'Hello, Explorer.');
 assert.equal(t('en','account.greeting',{name:'common.explorer'}),'Hello, common.explorer.');
 assert.equal(t('de','filter.count',{count:1000,total:2000}),'1.000 von 2.000 Welten');
 assert.equal(t('en','filter.count',{count:1000,total:2000}),'1,000 of 2,000 worlds');
 const timestamp=Date.UTC(2026,10,4,14,5);
 assert.notEqual(dateTime(timestamp,'de','UTC'),dateTime(timestamp,'en','UTC'));
 assert.equal(dateTime('invalid','en'),'—');
});
test('translation markers escape user values and never treat them as translation keys or HTML',()=>{
 const name='<script>Guten Morgen</script>';
 const html=translated('en','account.greeting',{name});
 assert.ok(html.includes('Hello, &lt;script&gt;Guten Morgen&lt;/script&gt;.'));
 assert.doesNotMatch(html,/<script>/);
 assert.match(translatedAttribute('en','aria-label','nav.home'),/aria-label="Worlds Hub home"/);
});
