type BetaUser={email:string;emailVerified:boolean};
export function djBetaAllowed(user:BetaUser|undefined|null,env:Record<string,string|undefined>=process.env){
 if(env.NODE_ENV==='development')return true;
 if(env.JAMLOOM_AI_DJ_BETA_ENABLED!=='true'||!user?.emailVerified)return false;
 const invited=(env.JAMLOOM_AI_DJ_BETA_EMAILS??'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
 return invited.length>0&&invited.length<=50&&invited.every(e=>/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(e))&&invited.includes(user.email.toLowerCase());
}

// Test DJ allowance remains independent of the website's live song-credit setting.
export function djBillingLive(env:Record<string,string|undefined>=process.env){
 const mode=env.JAMLOOM_AI_DJ_BILLING_MODE??'test';
 if(!['test','live'].includes(mode))throw Error('Invalid DJ billing mode');
 if(mode==='live'&&env.CREDIT_BILLING_MODE!=='live')throw Error('Live DJ requires live credit billing');
 return mode==='live';
}
