import {clearStatus,errorKey,status,text} from './i18n/browser.ts';

const identityRoot=document.querySelector<HTMLElement>('[data-identity]');
if(identityRoot){
 const root=identityRoot,message=root.querySelector<HTMLElement>('[data-identity-message]')!,csrf=root.querySelector<HTMLMetaElement>('meta[name="worlds-identity-csrf"]')!.content;
 const rawQuery=location.search.slice(1),params=new URLSearchParams(rawQuery),oauth=params.has('client_id');
 const forms=[...root.querySelectorAll<HTMLFormElement>('[data-identity-form]')];
 let busy=false,currentUser:{id:string;name?:string;email:string;emailVerified:boolean}|undefined;
 function show(mode:string){forms.forEach(form=>{form.hidden=form.dataset.identityForm!==mode;});root.querySelectorAll<HTMLButtonElement>('.identity-tabs button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.identityAction===mode)));clearStatus(message);}
 async function api(path:string,body?:Record<string,unknown>){
  const response=await fetch('/api/identity/'+path,{method:body?'POST':'GET',headers:body?{'content-type':'application/json','x-worlds-identity-csrf':csrf}:{},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
  const data=await response.json() as {message?:string;error?:string;url?:string;user?:{id:string;name?:string;email:string;emailVerified:boolean}};
  if(!response.ok)throw new Error(data.error??String(response.status));return data;
 }
 function navigate(url:string){const target=new URL(url,location.origin);if(target.protocol!=='https:')throw new Error('UNSAFE_REDIRECT');location.assign(target.href);}
 function renderUser(){const user=root.querySelector<HTMLElement>('[data-identity-user]'),greeting=root.querySelector<HTMLElement>('[data-identity-greeting]');if(user&&currentUser)user.textContent=text(currentUser.emailVerified?'status.emailVerified':'status.emailNeeded');if(greeting&&currentUser)greeting.textContent=currentUser.name?text('account.greeting',{name:currentUser.name}):text('identity.welcome');}
 async function refresh(){const data=await api('get-session');currentUser=data.user;const reset=root.dataset.mode==='reset',active=!!currentUser?.emailVerified;root.dataset.verified=String(active);const panel=root.querySelector<HTMLElement>('[data-identity-session]');if(panel)panel.hidden=!currentUser||reset;const anonymous=root.querySelector<HTMLElement>('[data-identity-anonymous]');if(anonymous)anonymous.hidden=active&&!reset;renderUser();const next=root.querySelector<HTMLButtonElement>('[data-identity-continue]');if(next)next.disabled=!active;return data;}
 function pending(value:boolean){busy=value;root.setAttribute('aria-busy',String(value));root.querySelectorAll<HTMLButtonElement>('button').forEach(button=>button.disabled=value||(button.hasAttribute('data-identity-continue')&&root.dataset.verified!=='true'));}
 async function continueOAuth(){const next=await api('oauth2/continue',{selected:true,oauth_query:rawQuery});if(!next.url)throw new Error('CONTINUE_FAILED');navigate(next.url);}
 function showError(error:unknown){const code=error instanceof Error?error.message:error;status(message,code==='UNSAFE_REDIRECT'?'error.unsafeRedirect':code==='CONTINUE_FAILED'?'error.continueFailed':errorKey(code));}
 for(const button of root.querySelectorAll<HTMLButtonElement>('[data-identity-action]'))button.addEventListener('click',()=>show(button.dataset.identityAction!));
 const inputs=root.querySelectorAll<HTMLInputElement>('input');
 function localizeValidation(input:HTMLInputElement){
  const key=input.validity.typeMismatch?'error.invalidEmail':input.name==='otp'&&input.validity.patternMismatch?'error.invalidCode':input.type==='password'&&input.validity.tooShort?'error.passwordShort':'error.invalidRequest';
  input.setCustomValidity(text(key));
 }
 for(const input of inputs){
  input.addEventListener('input',()=>input.setCustomValidity(''));
  input.addEventListener('invalid',()=>localizeValidation(input));
 }
 for(const form of forms)form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;pending(true);status(message,'status.waiting');const fields=Object.fromEntries(new FormData(form)) as Record<string,string>;
  try{
   const action=form.dataset.identityForm!;const paths:Record<string,string>={login:'sign-in/email',signup:'sign-up/email',verify:'email-otp/verify-email','send-code':'email-otp/send-verification-otp',forgot:'request-password-reset',reset:'reset-password',update:'update-user'};const body:Record<string,unknown>={...fields};
   if(action==='login'&&oauth)body.oauth_query=rawQuery;if(action==='send-code')body.type='email-verification';if(action==='reset'){body.token=params.get('token');if(!body.token)throw new Error('RESET_INCOMPLETE');}
   const data=await api(paths[action],body);form.reset();if(data.url){navigate(data.url);return;}
   if(action==='signup'){show('verify');const verifyEmail=root.querySelector<HTMLInputElement>('[data-identity-form=verify] input[name=email]');if(verifyEmail)verifyEmail.value=fields.email;status(message,'status.signupDone');}
   else if(action==='send-code')status(message,'status.codeSent');
   else if(action==='forgot')status(message,'status.recoverySent');
   else if(action==='reset'){history.replaceState(null,'','/identity/login');show('login');status(message,'status.passwordSaved');}
   else if(action==='verify'){show('login');status(message,'status.verifiedDone');}
   else{const session=await refresh();status(message,action==='update'?'status.nameSaved':'status.signedIn');if(oauth&&session.user?.emailVerified)await continueOAuth();}
  }catch(error){if(error instanceof Error&&error.message==='RESET_INCOMPLETE')status(message,'error.resetIncomplete');else showError(error);}finally{pending(false);}
 });
 root.querySelector('[data-identity-continue]')?.addEventListener('click',async()=>{if(busy)return;pending(true);status(message,'status.continuing');try{await continueOAuth();}catch(error){showError(error);}finally{pending(false);}});
 root.querySelector('[data-identity-logout]')?.addEventListener('click',async()=>{if(busy)return;pending(true);try{await api('sign-out',{});location.assign('/identity/login');}catch(error){showError(error);}finally{pending(false);}});
 for(const button of root.querySelectorAll<HTMLButtonElement>('[data-consent]'))button.addEventListener('click',async()=>{if(busy)return;pending(true);try{const data=await api('oauth2/consent',{accept:button.dataset.consent==='true',oauth_query:rawQuery});if(data.url)navigate(data.url);}catch(error){showError(error);}finally{pending(false);}});
 document.addEventListener('worlds:locale',()=>{
  renderUser();
  for(const input of inputs)if(input.validity.customError)localizeValidation(input);
 });
 show(root.dataset.mode==='reset'?'reset':'login');
 refresh().then(async data=>{if(data.user?.emailVerified&&root.dataset.mode==='login'){forms.forEach(form=>form.hidden=true);if(oauth){pending(true);status(message,'status.continuing');try{await continueOAuth();}catch(error){showError(error);}finally{pending(false);}}}else if(data.user&&!data.user.emailVerified&&root.dataset.mode==='login'){show('verify');const email=root.querySelector<HTMLInputElement>('[data-identity-form=verify] input[name=email]');if(email)email.value=data.user.email;}}).catch(()=>{const anonymous=root.querySelector<HTMLElement>('[data-identity-anonymous]');if(anonymous)anonymous.hidden=false;status(message,'error.sessionUnavailable');});
}
