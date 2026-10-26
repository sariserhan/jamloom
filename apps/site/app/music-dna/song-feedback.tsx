'use client';
import Link from 'next/link';
import {useMusicPlayer} from '../player';
import {useEffect,useState} from 'react';
import {likedTags,issueTags,type DnaFeedback} from '../../lib/dna-feedback-schema';
export function listenerHeaders(create=false):Record<string,string>{
 try{let id=localStorage.getItem('jamloom-dna-listener-v1');if((!id||!/^[a-f0-9]{32}$/.test(id))&&create){id=crypto.randomUUID().replaceAll('-','');localStorage.setItem('jamloom-dna-listener-v1',id);}return id&&/^[a-f0-9]{32}$/.test(id)?{'X-Jamloom-Listener':id}:{};}catch{return {};}
}
export function SongFeedback({id,account=false,product="music-dna"}:{id:string;account?:boolean;product?:string}){
 const player=useMusicPlayer(),[signInRequired,setSignInRequired]=useState(false);
 const [value,setValue]=useState<DnaFeedback|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(false),[revision,setRevision]=useState(0);
 const [canTrain,setCanTrain]=useState(!account),[rightsConfirmed,setRightsConfirmed]=useState(false),[owner,setOwner]=useState<string>();
 const endpoint=account?`/api/creation-feedback?kind=${encodeURIComponent(product)}&id=${encodeURIComponent(id)}`:`/api/taste/feedback?id=${id}`;
 useEffect(()=>{const reload=()=>setRevision(r=>r+1);window.addEventListener('jamloom-feedback-cleared',reload);return()=>window.removeEventListener('jamloom-feedback-cleared',reload);},[]);
 useEffect(()=>{const controller=new AbortController(),headers=listenerHeaders();setLoading(true);setLoadError(false);setSignInRequired(false);setValue(null);setSaved(false);setCanTrain(!account);setRightsConfirmed(false);setOwner(undefined);
 if(!account&&!headers['X-Jamloom-Listener']){setLoading(false);return;}
 void fetch(endpoint,{headers,signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])}).then(r=>{if(r.status===401){setSignInRequired(true);throw Error('sign-in');}if(!r.ok)throw Error();return r.json();}).then(data=>{if(controller.signal.aborted)return;setCanTrain(account?data.canTrain===true:true);setRightsConfirmed(data.rightsConfirmed===true);setOwner(data.owner);setValue(data.feedback??null);setSaved(Boolean(data.feedback));setMessage('');}).catch(error=>{if(!controller.signal.aborted){setLoadError(true);setMessage(error.message==='sign-in'?'Sign in to rate this song and mark a moment.':'Saved feedback could not load. Retry before changing it.');}}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[endpoint,revision,account]);
 async function submit(remove=false){
  const headers=listenerHeaders(true);if(!account&&!headers['X-Jamloom-Listener']){setMessage('Enable browser storage to save feedback.');return;}
  setBusy(true);try{const r=await fetch(endpoint,{method:remove?'DELETE':'POST',headers:{...headers,'Content-Type':'application/json','X-Jamloom-DNA':'1'},body:remove?(account?JSON.stringify({owner}):undefined):JSON.stringify({...value,rightsConfirmed,owner}),signal:AbortSignal.timeout(15000)});const data=await r.json();if(!r.ok)throw Error(data.error);
   if(remove){setValue(null);setSaved(false);setMessage('Feedback deleted. It will not guide new songs or future training.');}else{setSaved(true);setMessage(value?.trainingConsent?'Feedback and permission saved. This music can enter training after rights and quality review.':value?.personalize?'Feedback saved for your Music DNA preferences.':'Rating saved. Model training is off.');}
  }catch(error){setMessage(error instanceof Error?error.message:'Feedback could not be saved.');}finally{setBusy(false);}
 }
 return <div className="dna-feedback"><fieldset disabled={busy||loading||loadError} aria-label="Song feedback"><legend>Would you listen again?</legend><div className="product-actions">{(['like','dislike']as const).map(rating=><button key={rating} className="secondary" aria-pressed={value?.rating===rating} onClick={()=>setValue(old=>({rating,momentSeconds:old?.momentSeconds,tags:old?.rating===rating?old.tags:[],personalize:old?.personalize??false,trainingConsent:old?.trainingConsent??false}))}>{rating==='like'?'Yes, I like it':'Not for me'}</button>)}</div>
 {value&&<><p>{value.rating==='like'?'What worked? (optional, up to 6)':'What missed? (optional, up to 6)'}</p><div className="product-actions">{Object.entries(value.rating==='like'?likedTags:issueTags).map(([key,label])=><button className="secondary" aria-pressed={value.tags.includes(key)} key={key} onClick={()=>setValue({...value,tags:value.tags.includes(key)?value.tags.filter(t=>t!==key):value.tags.length<6?[...value.tags,key]:value.tags})}>{label}</button>)}</div>
 <label>Moment in the song (seconds, optional)<input type="number" min="0" max="36000" value={value.momentSeconds??''} onChange={e=>setValue({...value,momentSeconds:e.target.value===''?undefined:Number(e.target.value)})}/></label>{player.current?.id===id&&<button className="secondary" onClick={()=>setValue({...value,momentSeconds:Math.floor(player.time)})}>Mark current moment · {Math.floor(player.time)}s</button>}
 {product==='music-dna'&&<label><input type="checkbox" checked={value.personalize} onChange={e=>setValue({...value,personalize:e.target.checked})}/> Use this feedback to shape my future songs</label>}
 <label><input type="checkbox" disabled={!canTrain} checked={value.trainingConsent} onChange={e=>{setRightsConfirmed(e.target.checked);setValue({...value,trainingConsent:e.target.checked});}}/> I have training rights to all included music and voices, and allow this creation and rating to improve Jamloom’s models</label>
 <p>{canTrain?'Optional: permission covers commercial training, retained model weights and commercial generated outputs. Favorite recordings and raw uploads are excluded. Uncheck or delete to stop future use; this does not undo completed training.':'Only the owner of cloud-saved music can grant training permission. You can still rate this creation.'}</p>
 <div className="product-actions"><button className="secondary" onClick={()=>submit()}>Save feedback</button>{saved&&<button className="secondary" onClick={()=>submit(true)}>Delete feedback</button>}</div></>}
 <p role="status">{loading?'Loading feedback…':message}</p></fieldset>{signInRequired&&<Link href={'/account/sign-in?callbackURL='+encodeURIComponent((product==='library'?'/library':'/listen/'+product+'/'+id))}>Sign in to give feedback</Link>}{loadError&&!signInRequired&&<button className="secondary" onClick={()=>setRevision(r=>r+1)}>Reload feedback</button>}</div>;
}
export function FeedbackSettings({account=false}:{account?:boolean}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function clear(){
  const headers=listenerHeaders();if(!account&&!headers['X-Jamloom-Listener']){setMessage('No feedback is saved for this browser.');return;}
  setBusy(true);try{let owner;if(account){const current=await fetch('/api/account',{signal:AbortSignal.timeout(10000)});if(!current.ok)throw Error('Sign in to delete account feedback.');owner=(await current.json()).user.id;}const r=await fetch(account?'/api/creation-feedback':'/api/taste/feedback',{method:'DELETE',headers:{...headers,'X-Jamloom-DNA':'1','Content-Type':'application/json'},body:account?JSON.stringify({owner}):undefined,signal:AbortSignal.timeout(15000)});const data=await r.json();if(!r.ok)throw Error(data.error);
   window.dispatchEvent(new Event('jamloom-feedback-cleared'));setMessage(account?'All account feedback and its training permissions have been deleted.':'All feedback from this browser and its training permissions have been deleted.');
  }catch(error){setMessage(error instanceof Error?error.message:'Could not delete feedback. Please try again.');}finally{setBusy(false);}
 }
 return <details><summary>Feedback settings</summary><p>Delete your ratings and permissions to use them, including feedback on older songs. Your songs and favorites stay available.</p><button className="secondary" disabled={busy} onClick={clear}>Delete all my feedback</button><p role="status">{message}</p></details>;
}
