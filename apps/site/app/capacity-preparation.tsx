'use client';
import {useEffect,useRef,useState} from 'react';

export function CapacityPreparation({endpoint,onAvailable,disabled=false,inputs}:{endpoint:string;onAvailable:()=>void;disabled?:boolean;inputs:string}){
 const callback=useRef(onAvailable);callback.current=onAvailable;
 const [state,setState]=useState('checking'),[canPrepare,setCanPrepare]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),last=useRef('checking');
 const alive=useRef(true),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),started=useRef(Date.now()),posting=useRef(false);
 async function check(){
  clearTimeout(timer.current);
  try{
   const r=await fetch(endpoint,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Could not check song availability.');
   const data=await r.json();if(!alive.current)return;
   if(data.available===true&&data.creditsEnabled===true){callback.current();return;}
   setCanPrepare(data.canPrepare===true);const next=data.capacityState??'unavailable';
   // A start that ends without becoming available almost always means the GPU provider had no free card.
   if(last.current==='preparing'&&!['preparing','ready'].includes(next))setNotice('No music studio GPU was free this time, so it was switched off. Nothing was charged and no credits were used. Please try again in 15–30 minutes.');
   if(['preparing','ready'].includes(next))setNotice('');last.current=next;setState(next);
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
 const waiting=['preparing','ready','stopping'].includes(state),[now,setNow]=useState(Date.now());
 useEffect(()=>{if(!waiting)return;const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[waiting]);
 const elapsed=Math.max(0,Math.floor((now-started.current)/1000)),clock=`${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,'0')}`;
 return <div>
  {waiting||state==='checking'?<div className="generation-progress">
   <div className="generation-progress-art" aria-hidden="true">{[0,1,2,3,4].map(i=><i key={i}/>)}</div>
   <div className="generation-progress-copy"><strong role="status">{waiting?'Starting the music studio…':'Checking song availability…'}</strong>
    {waiting&&<p>Waiting {clock}. This usually takes 10–15 minutes while a GPU is found and the music model loads. Keep this page open; Generate unlocks by itself. No credits have been used.</p>}</div>
  </div>:<p role="status">{`Song creation is currently unavailable. ${inputs} and no credits have been used.`}</p>}
  {error&&<p role="alert">{error}</p>}{notice&&!error&&<p role="alert">{notice}</p>}
  {canPrepare&&!waiting&&!error&&<button className="secondary" disabled={disabled||busy} onClick={prepare}>{busy?'Preparing…':'Prepare song creation'}</button>}
  <button className="secondary" disabled={busy} onClick={()=>{setError('');void check();}}>Check availability</button>
 </div>;
}
