import {clearStatus,errorKey,status,text} from './i18n/browser.ts';

const identityRoot=document.querySelector<HTMLElement>('[data-identity]');
if(identityRoot){
 const root=identityRoot,message=root.querySelector<HTMLElement>('[data-identity-message]')!,csrf=root.querySelector<HTMLMetaElement>('meta[name="worlds-identity-csrf"]')!.content;
 const rawQuery=location.search.slice(1),params=new URLSearchParams(rawQuery),oauth=params.has('client_id');
 const forms=[...root.querySelectorAll<HTMLFormElement>('[data-identity-form]')];
 let busy=false,freshSignInRequired=false,currentUser:{id:string;name?:string;email:string;emailVerified:boolean}|undefined;
 function show(mode:string){forms.forEach(form=>{form.hidden=form.dataset.identityForm!==mode;});root.querySelectorAll<HTMLButtonElement>('.identity-tabs button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.identityAction===mode)));clearStatus(message);}
 async function api(path:string,body?:Record<string,unknown>){
  const response=await fetch('/api/identity/'+path,{method:body?'POST':'GET',headers:body?{'content-type':'application/json','x-worlds-identity-csrf':csrf}:{},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
  const data=await response.json() as {message?:string;error?:string;code?:string;url?:string;hubSessionsRevoked?:boolean;session?:{createdAt?:string};user?:{id:string;name?:string;email:string;emailVerified:boolean}};
  if(!response.ok)throw new Error(data.code??data.error??String(response.status));return data;
 }
 function navigate(url:string){const target=new URL(url,location.origin);if(target.protocol!=='https:')throw new Error('UNSAFE_REDIRECT');location.assign(target.href);}
 function renderUser(){const user=root.querySelector<HTMLElement>('[data-identity-user]'),greeting=root.querySelector<HTMLElement>('[data-identity-greeting]');if(user&&currentUser)user.textContent=text(currentUser.emailVerified?'status.emailVerified':'status.emailNeeded');if(greeting&&currentUser)greeting.textContent=currentUser.name?text('account.greeting',{name:currentUser.name}):text('identity.welcome');}
 async function refresh(){
  const data=await api('get-session');currentUser=data.user;
  const reset=root.dataset.mode==='reset';
  const maxAge=params.get('max_age'),createdAt=Date.parse(data.session?.createdAt??'');
  freshSignInRequired=oauth&&maxAge!==null&&(!/^\d+$/.test(maxAge)||!Number.isSafeInteger(Number(maxAge))||!Number.isFinite(createdAt)||
   createdAt>Date.now()+5000||Date.now()-createdAt>=Number(maxAge)*1000);
  const active=!!currentUser?.emailVerified&&!freshSignInRequired;
  root.dataset.verified=String(active);
  const panel=root.querySelector<HTMLElement>('[data-identity-session]');
  if(panel)panel.hidden=!currentUser||reset||freshSignInRequired;
  const anonymous=root.querySelector<HTMLElement>('[data-identity-anonymous]');
  if(anonymous)anonymous.hidden=active&&!reset;
  renderUser();pending(busy);return data;
 }
 function pending(value:boolean){busy=value;root.setAttribute('aria-busy',String(value));root.querySelectorAll<HTMLButtonElement>('button').forEach(button=>button.disabled=value||(button.matches('[data-identity-continue],[data-identity-verified-action]')&&root.dataset.verified!=='true'));}
 async function continueOAuth(){const next=await api('oauth2/continue',{selected:true,oauth_query:rawQuery});if(!next.url)throw new Error('CONTINUE_FAILED');navigate(next.url);}
 function showError(error:unknown){const code=error instanceof Error?error.message:error;status(message,code==='UNSAFE_REDIRECT'?'error.unsafeRedirect':code==='CONTINUE_FAILED'?'error.continueFailed':errorKey(code));}
 for(const button of root.querySelectorAll<HTMLButtonElement>('[data-identity-action]'))button.addEventListener('click',()=>show(button.dataset.identityAction!));
 const inputs=root.querySelectorAll<HTMLInputElement>('input');
 function localizeValidation(input:HTMLInputElement){
  const key=input.validity.typeMismatch?'error.invalidEmail':input.name==='otp'&&input.validity.patternMismatch?'error.invalidCode':input.type==='password'&&input.validity.tooLong?'error.passwordLong':input.type==='password'&&input.validity.tooShort?'error.passwordShort':'error.invalidRequest';
  input.setCustomValidity(text(key));
 }
 for(const input of inputs){
  input.addEventListener('input',()=>input.setCustomValidity(''));
  input.addEventListener('invalid',()=>localizeValidation(input));
 }
 for(const form of forms)form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;const fields=Object.fromEntries(new FormData(form)) as Record<string,string>;
  const action=form.dataset.identityForm!;
  if(action==='change-password'&&fields.newPassword!==fields.confirmation){status(message,'error.passwordMismatch');return;}
  pending(true);status(message,'status.waiting');
  try{
   const paths:Record<string,string>={login:'sign-in/email',signup:'sign-up/email',verify:'email-otp/verify-email','send-code':'email-otp/send-verification-otp',forgot:'request-password-reset',reset:'reset-password',update:'update-user','change-password':'change-password'};const body:Record<string,unknown>={...fields};
   if(action==='change-password')delete body.confirmation;
   if(action==='login'&&oauth)body.oauth_query=rawQuery;if(action==='send-code')body.type='email-verification';if(action==='reset'){body.token=params.get('token');if(!body.token)throw new Error('RESET_INCOMPLETE');}
   const data=await api(paths[action],body);form.reset();if(data.url){navigate(data.url);return;}
   if(action==='signup'){show('verify');const verifyEmail=root.querySelector<HTMLInputElement>('[data-identity-form=verify] input[name=email]');if(verifyEmail)verifyEmail.value=fields.email;status(message,'status.signupDone');}
   else if(action==='send-code')status(message,'status.codeSent');
   else if(action==='forgot')status(message,'status.recoverySent');
   else if(action==='reset'){history.replaceState(null,'','/identity/login');show('login');status(message,'status.passwordSaved');}
   else if(action==='change-password'){form.hidden=true;status(message,data.hubSessionsRevoked?'status.passwordChanged':'status.passwordChangedPartial');}
   else if(action==='verify'){show('login');status(message,'status.verifiedDone');}
   else{const session=await refresh();status(message,action==='update'?'status.nameSaved':'status.signedIn');if(oauth&&session.user?.emailVerified&&!freshSignInRequired)await continueOAuth();}
  }catch(error){if(error instanceof Error&&error.message==='RESET_INCOMPLETE')status(message,'error.resetIncomplete');else showError(error);}finally{if(action==='change-password')form.reset();pending(false);}
 });
 root.querySelector('[data-identity-export]')?.addEventListener('click',async()=>{
  if(busy)return;
  pending(true);status(message,'status.waiting');
  try{
   const data=await api('export',{}),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
   const link=document.createElement('a');link.href=url;link.download='worlds-identity.json';
   root.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
   status(message,'status.identityExported');
  }catch(error){showError(error);}finally{pending(false);}
 });
 root.querySelector('[data-identity-continue]')?.addEventListener('click',async()=>{if(busy)return;pending(true);status(message,'status.continuing');try{await continueOAuth();}catch(error){showError(error);}finally{pending(false);}});
 root.querySelector('[data-identity-device-sign-out]')?.addEventListener('click',async()=>{
  if(busy||!window.confirm(text('identity.signOutDevicesConfirm')))return;
  pending(true);status(message,'status.waiting');
  try{
   await api('revoke-sessions',{});
   currentUser=undefined;root.dataset.verified='false';
   const sessionPanel=root.querySelector<HTMLElement>('[data-identity-session]');
   const anonymous=root.querySelector<HTMLElement>('[data-identity-anonymous]');
   if(sessionPanel)sessionPanel.hidden=true;
   if(anonymous)anonymous.hidden=false;
   show('login');status(message,'status.signedOutDevices');
   root.querySelector<HTMLInputElement>('[data-identity-form="login"] input')?.focus();
  }catch(error){showError(error);}finally{pending(false);}
 });
 root.querySelector('[data-identity-logout]')?.addEventListener('click',async()=>{if(busy)return;pending(true);try{await api('sign-out',{});location.assign('/identity/login');}catch(error){showError(error);}finally{pending(false);}});
 for(const button of root.querySelectorAll<HTMLButtonElement>('[data-consent]'))button.addEventListener('click',async()=>{if(busy)return;pending(true);try{const data=await api('oauth2/consent',{accept:button.dataset.consent==='true',oauth_query:rawQuery});if(data.url)navigate(data.url);}catch(error){showError(error);}finally{pending(false);}});
 document.addEventListener('worlds:locale',()=>{
  renderUser();
  for(const input of inputs)if(input.validity.customError)localizeValidation(input);
 });
 show(root.dataset.mode==='reset'?'reset':'login');
 refresh().then(async data=>{
  if(root.dataset.mode!=='login')return;
  if(data.user?.emailVerified&&freshSignInRequired){
   show('login');
   const email=root.querySelector<HTMLInputElement>('[data-identity-form=login] input[name=email]');
   if(email)email.value=data.user.email;
   status(message,'status.confirmSignIn');
  }else if(data.user?.emailVerified){
   forms.forEach(form=>form.hidden=true);
   if(oauth){pending(true);status(message,'status.continuing');try{await continueOAuth();}catch(error){showError(error);}finally{pending(false);}}
  }else if(data.user){
   show('verify');
   const email=root.querySelector<HTMLInputElement>('[data-identity-form=verify] input[name=email]');
   if(email)email.value=data.user.email;
  }
 }).catch(()=>{const anonymous=root.querySelector<HTMLElement>('[data-identity-anonymous]');if(anonymous)anonymous.hidden=false;status(message,'error.sessionUnavailable');});
}
