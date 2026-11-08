// New Worlds passwords use a stronger minimum; existing provider passwords stay usable.
export const NEW_PASSWORD_MIN_LENGTH=12;
export const PASSWORD_MAX_LENGTH=128;

export function passwordPolicyError(value:unknown,isNew=false){
 if(typeof value!=='string'||!value.length)return 'INVALID_FIELDS';
 if(value.length>PASSWORD_MAX_LENGTH)return 'PASSWORD_TOO_LONG';
 if(isNew&&value.length<NEW_PASSWORD_MIN_LENGTH)return 'PASSWORD_TOO_SHORT';
 return null;
}
