'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {readFavorites,trackKind,trackKey,type ListeningTrack} from '../lib/listening';
import {visibleRefresh} from '../lib/visible-refresh';
export function useFavorites(){
 const [favorites,setFavorites]=useState<ListeningTrack[]>([]),[owner,setOwner]=useState<string|null>(null),[ready,setReady]=useState(false),[status,setStatus]=useState('Checking your library…'),[busy,setBusy]=useState(false),[actionError,setActionError]=useState(''),[guestCount,setGuestCount]=useState(0),[unavailable,setUnavailable]=useState<{kind:string;id:string}[]>([]);
 const identity=useRef<string|null>(null),version=useRef(0),writing=useRef(false),pathname=usePathname();
 const guest=()=>{try{return readFavorites(localStorage.getItem('jamloom-favorites-v1'));}catch{return [];}};
 const refresh=useCallback(async()=>{if(writing.current)return;const v=++version.current;try{const r=await fetch('/api/favorites',{cache:'no-store',signal:AbortSignal.timeout(15000)});if(v!==version.current)return;
  if(r.status===401){setReady(true);identity.current=null;setOwner(null);setFavorites(guest());setUnavailable([]);setStatus('Saved on this device. Sign in to sync.');return;}
  if(!r.ok)throw Error();const data=await r.json();if(v!==version.current)return;setReady(true);identity.current=data.owner;setOwner(data.owner);setFavorites(data.tracks);setUnavailable(data.unavailable);setGuestCount(guest().length);setStatus('Synced with your account.');
 }catch{if(v===version.current)setStatus('Favorites could not sync. Check your connection and retry.');}},[]);
 useEffect(()=>{const stop=visibleRefresh(refresh),storage=()=>{if(!document.hidden)void refresh();};window.addEventListener('storage',storage);return()=>{++version.current;stop();window.removeEventListener('storage',storage);};},[refresh,pathname]);
 async function change(track:ListeningTrack,remove:boolean){const account=identity.current;if(!account){const prior=guest(),key=trackKey(track),next=remove?prior.filter(t=>trackKey(t)!==key):[track,...prior.filter(t=>trackKey(t)!==key)].slice(0,500);localStorage.setItem('jamloom-favorites-v1',JSON.stringify(next));setFavorites(next);return;}
 const r=await fetch('/api/favorites',{method:remove?'DELETE':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:track.id,kind:trackKind(track),owner:account}),signal:AbortSignal.timeout(15000)});if(!r.ok){const d=await r.json();throw Error(d.error??'Favorites could not sync.');}}
 async function toggle(track:ListeningTrack,remove=favorites.some(t=>trackKey(t)===trackKey(track))){if(!ready||writing.current)return;writing.current=true;++version.current;setBusy(true);setActionError('');let failure='';try{await change(track,remove);}catch(e){failure=(e as Error).message;}finally{writing.current=false;setBusy(false);await refresh();if(failure){setStatus(failure);setActionError(failure);}}}
 async function importGuest(){if(!identity.current||writing.current)return;writing.current=true;++version.current;setBusy(true);setActionError('');let failure='';try{for(const t of guest())await change(t,false);localStorage.removeItem('jamloom-favorites-v1');setGuestCount(0);}catch(e){failure='Import paused. Device favorites are kept. '+(e as Error).message;}finally{writing.current=false;setBusy(false);await refresh();if(failure){setStatus(failure);setActionError(failure);}}}
 return {favorites,owner,status,actionError,busy:busy||!ready,guestCount,unavailable,toggle,importGuest,refresh};
}
