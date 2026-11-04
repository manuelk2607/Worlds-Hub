import './identity-client.ts';
const root=document.documentElement;
const themeButton=document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
function updateThemeButton(){if(themeButton){const dark=root.dataset.theme==='dark';themeButton.setAttribute('aria-pressed',String(dark));themeButton.setAttribute('aria-label',dark?'Hellen Modus aktivieren':'Dunklen Modus aktivieren');}}
try{root.dataset.theme=localStorage.getItem('worlds-theme')??(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');}catch{root.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
updateThemeButton();
themeButton?.addEventListener('click',()=>{root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('worlds-theme',root.dataset.theme);}catch{/* Theme works without storage. */}updateThemeButton();});
const filters=[...document.querySelectorAll<HTMLButtonElement>('[data-filter]')];
const cards=[...document.querySelectorAll<HTMLElement>('[data-interests]')];
for(const button of filters) button.addEventListener('click',()=>{const filter=button.dataset.filter;filters.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));for(const card of cards)card.hidden=filter!=='alle'&&!card.dataset.interests?.split(' ').includes(filter??'');const count=document.querySelector('[data-count]');if(count)count.textContent=`${cards.filter(c=>!c.hidden).length} von 4 Welten`;});

// Fetch the same-origin POST first, then perform a normal top-level OIDC navigation.
// This avoids a form redirect across hosts; credentials remain server-side.
for(const form of document.querySelectorAll<HTMLFormElement>('[data-auth-login]'))form.addEventListener('submit',async event=>{
 event.preventDefault();const button=form.querySelector<HTMLButtonElement>('button')!,message=form.querySelector<HTMLElement>('[data-auth-message]')!;
 if(button.disabled)return;button.disabled=true;message.textContent='Anmeldung wird geöffnet …';
 try{const response=await fetch(form.action,{method:'POST',headers:{accept:'application/json'},signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('Die Anmeldung ist gerade nicht erreichbar. Bitte versuche es erneut.');const result=await response.json() as {url:string};const url=new URL(result.url);if(url.protocol!=='https:')throw new Error('Unsichere Anmeldung abgelehnt.');location.assign(url.href);}
 catch(error){message.textContent=(error as Error).message;button.disabled=false;}
});
