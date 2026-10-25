'use client';
import {createContext,useContext,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import aurowall from '../../../assets/manifests/aurowall-public.json';
import {audioURL,readFavorites,type ListeningTrack} from '../lib/listening';
const PlayerContext=createContext({play:(_track:ListeningTrack,_queue?:ListeningTrack[])=>{},enqueue:(_track:ListeningTrack)=>{},toggle:(_track:ListeningTrack)=>{},favorites:[] as ListeningTrack[],current:null as ListeningTrack|null,time:0});
export function useMusicPlayer(){return useContext(PlayerContext);}
export function MusicPlayer({children}:{children:React.ReactNode}){
 const audio=useRef<HTMLAudioElement>(null),[queue,setQueue]=useState<ListeningTrack[]>([]),[current,setCurrent]=useState<ListeningTrack|null>(null),[error,setError]=useState(''),[favorites,setFavorites]=useState<ListeningTrack[]>([]),[time,setTime]=useState(0),[open,setOpen]=useState(false);
 useEffect(()=>{const sync=()=>{try{setFavorites(readFavorites(localStorage.getItem('jamloom-favorites-v1')));}catch{}};sync();window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[]);
 function play(track:ListeningTrack,list=[track]){
  setQueue(list);setCurrent(track);setTime(0);setError('');
  if(audio.current){audio.current.src=aurowall.tracks.some(t=>t.id===track.id&&t.url===track.url)?track.url!:audioURL(track);void audio.current.play().catch(()=>setError('Playback could not start. Try Play again.'));}
 }
 function toggle(track:ListeningTrack){const next=favorites.some(t=>t.id===track.id)?favorites.filter(t=>t.id!==track.id):[track,...favorites].slice(0,500);try{localStorage.setItem('jamloom-favorites-v1',JSON.stringify(next));setFavorites(next);}catch{setError('Favorites could not be saved. Check browser storage.');}}
 const index=queue.findIndex(t=>t.id===current?.id);
 return <PlayerContext.Provider value={{play,enqueue:track=>{if(!current)play(track);else setQueue(old=>old.some(t=>t.id===track.id)?old:[...old,track].slice(0,500));},toggle,favorites,current,time}}>{children}<aside className="music-player" hidden={!current} aria-label="Music player">
 <div><strong>{current?.title}</strong><span className="muted">{current?.artist}</span></div>
 <audio ref={audio} controls preload="none" aria-label="Catalogue player" onTimeUpdate={e=>setTime(e.currentTarget.currentTime)} onPlay={e=>document.querySelectorAll('audio').forEach(a=>{if(a!==e.currentTarget)a.pause();})} onError={()=>setError('This track is unavailable. Retry or choose another song.')} onEnded={()=>{if(queue[index+1])play(queue[index+1],queue);}}/>
 <div className="product-actions"><button className="text-button" aria-label="Previous track" disabled={index<=0} onClick={()=>play(queue[index-1],queue)}>‹</button><button className="text-button" aria-label="Next track" disabled={index<0||index>=queue.length-1} onClick={()=>play(queue[index+1],queue)}>›</button>{current&&<FavoriteTrack track={current}/>}<button className="text-button" aria-expanded={open} onClick={()=>setOpen(!open)}>Queue ({queue.length})</button><button className="text-button" aria-label="Close player" onClick={()=>{audio.current?.pause();audio.current?.removeAttribute('src');audio.current?.load();setCurrent(null);setQueue([]);setOpen(false);}}>×</button></div>
 {error&&<p role="alert">{error} {current&&<button onClick={()=>play(current,queue)}>Retry playback</button>}</p>}
 {open&&<ol className="player-queue">{queue.map((t,i)=><li key={i}><button aria-current={i===index?'true':undefined} onClick={()=>play(t,queue)}>{i+1}. {t.title}</button><button aria-label={`Remove ${t.title} from queue`} disabled={i===index} onClick={()=>setQueue(queue.filter((_,n)=>n!==i))}>×</button></li>)}</ol>}
 </aside></PlayerContext.Provider>;
}
export function FavoriteTrack({track}:{track:ListeningTrack}){const {toggle,favorites}=useMusicPlayer(),saved=favorites.some(t=>t.id===track.id);return <button className="text-button" aria-label={`${saved?'Unsave':'Save'} ${track.title}`} aria-pressed={saved} onClick={()=>toggle(track)}>{saved?'♥ Saved':'♡ Save'}</button>;}
export function PlayTrack({track,queue}:{track:ListeningTrack;queue?:ListeningTrack[]}){const {play}=useMusicPlayer();return <button className="secondary" onClick={()=>play(track,queue)} aria-label={`Play ${track.title}`}>▶ Play</button>;}
export function QueueTrack({track}:{track:ListeningTrack}){const {enqueue}=useMusicPlayer(),[added,setAdded]=useState(false);return <button className="text-button" onClick={()=>{enqueue(track);setAdded(true);}} aria-label={`Queue ${track.title}`}>{added?'✓ Queued':'＋ Queue'}</button>;}
export function FavoriteLibrary(){const {favorites}=useMusicPlayer();return <section><h2>Your favorites</h2><p>Saved in this browser. Account playlists are available in <Link prefetch={false} href="/playlists">Playlists</Link>.</p>{favorites.length?<ul className="catalogue-list">{favorites.map(t=><li key={t.id}>{aurowall.tracks.some(a=>a.id===t.id)?<span>{t.title}</span>:<Link prefetch={false} href={t.href??`/catalogue/${t.id}`}>{t.title}</Link>}<PlayTrack track={t} queue={favorites}/><FavoriteTrack track={t}/></li>)}</ul>:<p>Tap ♡ on a song to find it here later.</p>}</section>;}
