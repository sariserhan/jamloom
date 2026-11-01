// Only operator-selected, authenticated accounts use the App Review test ledger.
// Request bodies, headers and unverified receipt claims never select this mode.
export function appleReviewAccount(owner:string,env:Record<string,string|undefined>=process.env,now=Date.now()){
 if(env.JAMLOOM_APPLE_REVIEW_ENABLED!=='true')return false;
 const ids=(env.JAMLOOM_APPLE_REVIEW_USER_IDS??'').split(',').map(s=>s.trim());
 const expires=Date.parse(env.JAMLOOM_APPLE_REVIEW_EXPIRES_AT??'');
 if(ids.length<1||ids.length>5||ids.some(id=>!/^[A-Za-z0-9_-]{1,128}$/.test(id))||new Set(ids).size!==ids.length||!Number.isFinite(expires))throw Error('Invalid Apple review configuration');
 return expires>now&&expires<=now+30*86400000&&ids.includes(owner);
}
export function accountCreditLive(owner:string,env:Record<string,string|undefined>=process.env){
 return env.CREDIT_BILLING_MODE==='live'&&!appleReviewAccount(owner,env);
}
