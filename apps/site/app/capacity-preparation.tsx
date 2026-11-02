'use client';
import {useEffect,useRef,useState} from 'react';

export function CapacityPreparation({endpoint,onAvailable,disabled=false,inputs}:{endpoint:string;onAvailable:()=>void;disabled?:boolean;inputs:string}){
 const callback=useRef(onAvailable);callback.current=onAvailable;
 const [state,setState]=useState('checking'),[canPrepare,setCanPrepare]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const alive=useRef(true),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),started=useRef(Date.now()),posting=useRef(false);
 async function check(){
  clearTimeout(timer.current);
  try{
   const r=await fetch(endpoint,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Could not check song availability.');
   const data=await r.json();if(!alive.current)return;
   if(data.available===true&&data.creditsEnabled===true){callback.current();return;}
   setCanPrepare(data.canPrepare===true);setState(data.capacityState??'unavailable');
   if(['preparing','ready','stopping'].includes(data.capacityState)&&Date.now()-started.current<21*60000)timer.current=setTimeout(check,5000);
  }catch{if(alive.current){setState('unavailable');setError('Could not check song availability. Check again before trying to prepare.');}}
 }
 useEffect(()=>{alive.current=true;void check();return()=>{alive.current=false;clearTimeout(timer.current);};},[endpoint]); // Read-only on mount, including Strict Mode.
 async function prepare(){
  if(posting.current||disabled)return;posting.current=true;setBusy(true);setError('');clearTimeout(timer.current);
  try{
   const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-Jamloom-DNA':'1'},body:JSON.stringify({action:'prepare'}),signal:AbortSignal.timeout(45000)});
   const data=await r.json();if(!r.ok)throw Error(data.error??'Song preparation is unavailable.');
   if(!alive.current)return;setState(data.state);started.current=Date.now();await check();
  }catch(e){if(alive.current){setError(e instanceof Error?e.message:'Could not confirm preparation. Check availability before trying again.');setState('unavailable');}}
  finally{posting.current=false;if(alive.current)setBusy(false);}
 }
 const waiting=['preparing','ready','stopping'].includes(state);
 return <div>
  <p role="status">{state==='checking'?'Checking song availability…':waiting?'Preparing song creation. This can take several minutes. No credits have been used.':`Song creation is currently unavailable. ${inputs} and no credits have been used.`}</p>
  {error&&<p role="alert">{error}</p>}
  {canPrepare&&!waiting&&!error&&<button className="secondary" disabled={disabled||busy} onClick={prepare}>{busy?'Preparing…':'Prepare song creation'}</button>}
  <button className="secondary" disabled={busy} onClick={()=>{setError('');void check();}}>Check availability</button>
 </div>;
}
