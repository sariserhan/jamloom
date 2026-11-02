'use client';
export type GenerationAccount={state:'loading'}|{state:'signed-out'}|{state:'unavailable'}|{state:'ready';available:number;purchasesReleased:boolean};
export async function generationAccount():Promise<GenerationAccount>{
 try{
  const response=await fetch('/api/account',{signal:AbortSignal.timeout(10000)});
  if(response.status===401)return {state:'signed-out'};
  if(!response.ok)return {state:'unavailable'};
  const data=await response.json();
  if(!data.user||!Number.isSafeInteger(data.balance?.available)||data.balance.available<0)return {state:'unavailable'};
  return {state:'ready',available:data.balance.available,purchasesReleased:data.purchasesReleased===true};
 }catch{return {state:'unavailable'};}
}
export function GenerationAccountNotice({account,credits,returnTo,onSignIn,onRefresh}:{account:GenerationAccount;credits:number;returnTo:string;onSignIn?:()=>void;onRefresh:()=>void}){
 if(account.state==='loading')return <p role="status">Checking your account…</p>;
 if(account.state==='signed-out')return <div className="product-panel"><h3>Sign in to make your song</h3><p>You can explore and choose your sound for free. Generating this song requires a verified account and {credits} credits.</p>{onSignIn?<button className="primary" onClick={onSignIn}>Sign in to continue</button>:<a className="primary" href={'/account/sign-in?callbackURL='+encodeURIComponent(returnTo)}>Sign in to continue</a>}<button className="secondary" onClick={onRefresh}>I’ve signed in — check again</button></div>;
 if(account.state==='unavailable')return <div><p role="status">We couldn’t check your account. Your choices are still here.</p><button className="secondary" onClick={onRefresh}>Check account again</button></div>;
 return <div><p>Your balance: <strong>{account.available} credits</strong> · This song: <strong>{credits} credits</strong>.</p>{account.available<credits&&<><p role="status">You need {credits-account.available} more credits to generate this song.{!account.purchasesReleased?' Credit purchases are not open yet.':''}</p><a className="secondary" href="/account/credits">View credits and plans</a></>}</div>;
}
