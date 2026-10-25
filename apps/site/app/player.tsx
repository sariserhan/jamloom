'use client';
import {createContext,useContext,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import aurowall from '../../../assets/manifests/aurowall-public.json';
import {audioURL,trackKey,type ListeningTrack} from '../lib/listening';
import {useFavorites} from './favorites';
import {AddToPlaylist} from './catalogue/controls';
const PlayerContext=createContext({play:(_track:ListeningTrack,_queue?:ListeningTrack[])=>{},enqueue:(_track:ListeningTrack)=>{},toggle:(_track:ListeningTrack,_remove?:boolean)=>{},favorites:[] as ListeningTrack[],owner:null as string|null,status:'',actionError:'',busy:false,guestCount:0,unavailable:[] as {kind:string;id:string}[],importGuest:()=>{},refresh:()=>{},current:null as ListeningTrack|null,time:0});
export function useMusicPlayer(){return useContext(PlayerContext);}
export function MusicPlayer({children}:{children:React.ReactNode}){
 const audio=useRef<HTMLAudioElement>(null),[queue,setQueue]=useState<ListeningTrack[]>([]),[current,setCurrent]=useState<ListeningTrack|null>(null),[error,setError]=useState(''),[time,setTime]=useState(0),[open,setOpen]=useState(false);
 const saved=useFavorites(),{favorites,toggle}=saved,previousOwner=useRef<string|null>(null);
 useEffect(()=>{if(previousOwner.current&&previousOwner.current!==saved.owner){audio.current?.pause();audio.current?.removeAttribute('src');audio.current?.load();setCurrent(null);setQueue([]);setOpen(false);}previousOwner.current=saved.owner;},[saved.owner]);
 function play(track:ListeningTrack,list=[track]){
  setQueue(list);setCurrent(track);setTime(0);setError('');
  if(audio.current){audio.current.src=aurowall.tracks.some(t=>trackKey(t)===trackKey(track)&&t.url===track.url)?track.url!:audioURL(track);void audio.current.play().catch(()=>setError('Playback could not start. Try Play again.'));}
 }
 const index=queue.findIndex(t=>current&&trackKey(t)===trackKey(current));
 return <PlayerContext.Provider value={{play,enqueue:track=>{if(!current)play(track);else setQueue(old=>old.some(t=>trackKey(t)===trackKey(track))?old:[...old,track].slice(0,500));},...saved,current,time}}>{children}{saved.actionError&&<p className="account-error" role="alert">{saved.actionError}</p>}<aside className="music-player" hidden={!current} aria-label="Music player">
 <div><strong>{current?.title}</strong><span className="muted">{current?.artist}</span></div>
 <audio ref={audio} controls preload="none" aria-label="Catalogue player" onTimeUpdate={e=>setTime(e.currentTarget.currentTime)} onPlay={e=>document.querySelectorAll('audio').forEach(a=>{if(a!==e.currentTarget)a.pause();})} onError={()=>setError('This track is unavailable. Retry or choose another song.')} onEnded={()=>{if(queue[index+1])play(queue[index+1],queue);}}/>
 <div className="product-actions"><button className="text-button" aria-label="Previous track" disabled={index<=0} onClick={()=>play(queue[index-1],queue)}>‹</button><button className="text-button" aria-label="Next track" disabled={index<0||index>=queue.length-1} onClick={()=>play(queue[index+1],queue)}>›</button>{current&&<FavoriteTrack track={current}/>}<button className="text-button" aria-expanded={open} onClick={()=>setOpen(!open)}>Queue ({queue.length})</button><button className="text-button" aria-label="Close player" onClick={()=>{audio.current?.pause();audio.current?.removeAttribute('src');audio.current?.load();setCurrent(null);setQueue([]);setOpen(false);}}>×</button></div>
 {error&&<p role="alert">{error} {current&&<button onClick={()=>play(current,queue)}>Retry playback</button>}</p>}
 {open&&<ol className="player-queue">{queue.map((t,i)=><li key={i}><button aria-current={i===index?'true':undefined} onClick={()=>play(t,queue)}>{i+1}. {t.title}</button><button aria-label={`Remove ${t.title} from queue`} disabled={i===index} onClick={()=>setQueue(queue.filter((_,n)=>n!==i))}>×</button></li>)}</ol>}
 </aside></PlayerContext.Provider>;
}
export function FavoriteTrack({track}:{track:ListeningTrack}){const {toggle,favorites,busy}=useMusicPlayer(),saved=favorites.some(t=>trackKey(t)===trackKey(track));return <button className="text-button" aria-label={`${saved?'Unsave':'Save'} ${track.title}`} aria-pressed={saved} disabled={busy} onClick={()=>toggle(track)}>{saved?'♥ Saved':'♡ Save'}</button>;}
export function PlayTrack({track,queue}:{track:ListeningTrack;queue?:ListeningTrack[]}){const {play}=useMusicPlayer();return <button className="secondary" onClick={()=>play(track,queue)} aria-label={`Play ${track.title}`}>▶ Play</button>;}
export function QueueTrack({track}:{track:ListeningTrack}){const {enqueue}=useMusicPlayer(),[added,setAdded]=useState(false);return <button className="text-button" onClick={()=>{enqueue(track);setAdded(true);}} aria-label={`Queue ${track.title}`}>{added?'✓ Queued':'＋ Queue'}</button>;}
export function FavoriteLibrary(){const {favorites,owner,status,busy,guestCount,unavailable,toggle,importGuest,refresh}=useMusicPlayer();return <section><h2>Your favorites</h2><p role="status">{status}</p><div className="product-actions"><button className="text-button" onClick={refresh}>Refresh favorites</button>{owner&&guestCount>0&&<button className="secondary" disabled={busy} onClick={importGuest}>Import {guestCount} device favorites</button>}<Link prefetch={false} href={owner?'/playlists':'/account/sign-in'}>{owner?'Your playlists':'Sign in to sync'}</Link></div>{favorites.length?<ul className="catalogue-list">{favorites.map(t=><li key={trackKey(t)}>{t.href?<Link prefetch={false} href={t.href}>{t.title}</Link>:<span>{t.title}</span>}<PlayTrack track={t} queue={favorites}/><FavoriteTrack track={t}/><AddToPlaylist track={t}/></li>)}</ul>:<p>Tap ♡ on a song to find it here later.</p>}{unavailable.length>0&&<ul className="catalogue-list">{unavailable.map(t=><li key={t.kind+t.id}><span>Unavailable song</span><button disabled={busy} onClick={()=>toggle({...t,title:'Unavailable song',artist:''},true)}>Remove favorite</button></li>)}</ul>}</section>;}
