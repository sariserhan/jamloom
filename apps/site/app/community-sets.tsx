'use client';
import {useEffect,useState} from 'react';
import {visibleRefresh} from '../lib/visible-refresh';
type SharedSet={id:string;title:string;seconds:number};
export function CommunitySets(){
 const [sets,setSets]=useState<SharedSet[]>([]),[message,setMessage]=useState('Loading DJ sets…');
 useEffect(()=>{
  const controller=new AbortController();let busy=false;
  async function refresh(){if(document.hidden||busy)return;busy=true;try{
   const response=await fetch('/api/ai-dj/sets',{cache:'no-store',signal:controller.signal}),data=await response.json();
   if(!response.ok||!Array.isArray(data.sets))throw Error();
   if(!controller.signal.aborted){setSets(data.sets.slice(0,3));setMessage(data.sets.length?'':'Your next party could be here.');}
  }catch{if(!controller.signal.aborted)setMessage('DJ sets are temporarily unavailable.');}finally{busy=false;}}
  const stop=visibleRefresh(refresh);
  return()=>{controller.abort();stop();};
 },[]);
 return <section className="product-panel" aria-label="Community DJ sets"><p className="eyebrow">The whole party, on replay</p><h2>Community DJ sets</h2><div className="dna-song-grid">{sets.map(set=><article key={set.id}><h3>{set.title}</h3><p>{Math.max(1,Math.round(set.seconds/60))} min · Full performance</p><audio controls preload="none" aria-label={'Listen to '+set.title} src={'/api/ai-dj/sets/'+set.id+'/audio'} onPlay={event=>document.querySelectorAll('audio').forEach(audio=>{if(audio!==event.currentTarget)audio.pause();})}/></article>)}</div>{message&&<p role="status">{message}</p>}<a className="text-button" href="/ai-dj/sets">Explore all DJ sets →</a></section>;
}
