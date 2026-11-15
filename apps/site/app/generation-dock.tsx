'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';

// Site-wide song progress. Lives in the root layout, so it follows the listener across pages.
// It only contacts the server for browsers that have started a song (keeps Neon asleep otherwise).
type Product='music-dna'|'improvise';
type Song={id:string;product:Product;state:string;phase?:string|null;title?:string|null};
const ENDPOINT:Record<Product,string>={'music-dna':'/api/taste/song',improvise:'/api/improvise/song'};
const PAGE:Record<Product,string>={'music-dna':'/music-dna',improvise:'/improvise'};
const FLAG='jamloom-song-owner',DISMISSED='jamloom-dock-dismissed';
const STAGES:Record<string,[string,number]>={starting:['Starting the music studio',.15],queued:['Waiting to start',.2],preparing:['Getting your song ready',.25],writing:['Writing your song',.4],composing:['Creating your music',.6],retrying:['Making another take',.6],checking:['Checking your song',.8],saving:['Almost ready',.9]};
const active=(s:Song)=>['queued','running'].includes(s.state);
const read=(key:string)=>{try{return JSON.parse(localStorage.getItem(key)??'null');}catch{return null;}};
const write=(key:string,value:unknown)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};

/** Pages call this after a successful Generate so the dock appears immediately. */
export function announceSong(id:string,product:Product){
 write(FLAG,true);window.dispatchEvent(new CustomEvent('jamloom-song-started',{detail:{id,product}}));
}

export function GenerationDock(){
 const [songs,setSongs]=useState<Song[]>([]),[started,setStarted]=useState<Record<string,number>>({}),[now,setNow]=useState(Date.now());
 const dismissed=useRef<string[]>([]);
 const discover=useCallback(async()=>{
  if(!read(FLAG))return;
  try{
   const r=await fetch('/api/songs/active',{cache:'no-store'});
   if(r.status===401){write(FLAG,false);return;}
   if(!r.ok)return;
   const list:Song[]=(await r.json()).songs.filter((s:Song)=>!dismissed.current.includes(s.id));
   setSongs(list);
  }catch{/* Progress display only; the song itself is unaffected. */}
 },[]);
 useEffect(()=>{
  dismissed.current=read(DISMISSED)??[];void discover();
  const onStart=(e:Event)=>{const {id,product}=(e as CustomEvent).detail;setStarted(s=>({...s,[id]:Date.now()}));setSongs(list=>[{id,product,state:'queued',phase:'starting'},...list.filter(s=>s.id!==id)]);};
  window.addEventListener('jamloom-song-started',onStart);return()=>window.removeEventListener('jamloom-song-started',onStart);
 },[discover]);
 // Poll each song in progress; the per-song read also nudges the server to dispatch it.
 useEffect(()=>{
  if(!songs.some(active))return;
  let stopped=false;
  const poll=async()=>{
   const next=await Promise.all(songs.map(async s=>{
    if(!active(s))return s;
    try{const r=await fetch(`${ENDPOINT[s.product]}?id=${s.id}`,{cache:'no-store'});if(!r.ok)return s;const v=await r.json();return {...s,state:v.state??s.state,phase:v.phase??s.phase,title:v.title??s.title};}catch{return s;}
   }));
   if(!stopped)setSongs(next);
  };
  const timer=setInterval(()=>{setNow(Date.now());},1000),polling=setInterval(poll,5000);void poll();
  return()=>{stopped=true;clearInterval(timer);clearInterval(polling);};
 },[songs.map(s=>s.id+s.state).join()]); // eslint-disable-line react-hooks/exhaustive-deps
 const close=(id:string)=>{dismissed.current=[...dismissed.current,id].slice(-20);write(DISMISSED,dismissed.current);setSongs(list=>list.filter(s=>s.id!==id));};
 const song=songs[0];if(!song)return null;
 const [label,fraction]=STAGES[song.phase??'']??STAGES[song.state]??['Creating your music',.5];
 const since=started[song.id],elapsed=since?Math.max(0,Math.floor((now-since)/1000)):0,clock=since?` · ${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,'0')}`:'';
 return <aside className="generation-dock" data-state={song.state} aria-label="Your song">
  {active(song)?<>
   <div className="dock-row"><span className="dock-dot" aria-hidden="true"/><strong role="status">{label}{clock}</strong>
    <span className="dock-hint">{song.phase==='starting'?'Usually 5–10 minutes. Keep browsing — we’ll email you too.':'Keep browsing — it follows you.'}</span>
    <Link prefetch={false} href="/my-songs">Your songs</Link></div>
   <div className="dock-bar" role="progressbar" aria-label="Song progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fraction*100)}><span style={{width:`${fraction*100}%`}}/></div>
  </>:song.state==='completed'?<div className="dock-done">
   <div className="dock-row"><strong role="status">Your song is ready{song.title?`: ${song.title}`:''}</strong><button type="button" className="dock-close" aria-label="Close" onClick={()=>close(song.id)}>×</button></div>
   <audio controls preload="none" src={`${ENDPOINT[song.product]}?id=${song.id}&file=audio`} aria-label={song.title??'Your new song'}/>
   <div className="dock-row"><Link prefetch={false} href={PAGE[song.product]}>Open in {song.product==='improvise'?'Improvise':'Music DNA'}</Link><Link prefetch={false} href="/my-songs">All your songs</Link></div>
  </div>:<div className="dock-row"><strong role="status">{song.state==='cancelled'?'Song stopped.':'We couldn’t finish your song.'} Your credits were returned.</strong><Link prefetch={false} href={PAGE[song.product]}>Try again</Link><button type="button" className="dock-close" aria-label="Close" onClick={()=>close(song.id)}>×</button></div>}
 </aside>;
}
