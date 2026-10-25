type BetaUser={email:string;emailVerified:boolean};
export function djBetaAllowed(user:BetaUser|undefined|null,env:Record<string,string|undefined>=process.env){
 if(env.NODE_ENV==='development')return true;
 if(env.JAMLOOM_AI_DJ_BETA_ENABLED!=='true'||!user?.emailVerified)return false;
 const invited=(env.JAMLOOM_AI_DJ_BETA_EMAILS??'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
 return invited.length>0&&invited.length<=50&&invited.every(e=>/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(e))&&invited.includes(user.email.toLowerCase());
}
