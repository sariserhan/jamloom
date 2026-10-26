import {SongFeedback} from '../music-dna/song-feedback';
import {useEffect,useRef,useState} from 'react';
import {pendingSet,stageSet,forgetSet,uploadSet,recordingAPI,type RecordedSet,type PendingSet} from '../../lib/dj-recording-upload';
type Saved={id:string;title:string;seconds:number;state:string;created_at:string;visibility:'public'|'private';withdrawn_at:string|null;interrupted?:boolean};
export function SavedSets({owner,take}:{owner:string|null;take:RecordedSet|null}){
 const [items,setItems]=useState<Saved[]>([]),[pending,setPending]=useState<PendingSet|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const controller=useRef<AbortController|null>(null),handled=useRef<RecordedSet|null>(null),alive=useRef(false),active=useRef(false);
 async function refresh(){const data=await recordingAPI();if(data.owner!==owner)throw Error('Your account changed. Reload before saving.');if(alive.current)setItems(data.recordings);}
 async function save(value:PendingSet){
  if(active.current)return;active.current=true;setBusy(true);const abort=new AbortController();controller.current=abort;
  try{await uploadSet(value,text=>{if(alive.current)setMessage(text);},abort.signal);if(alive.current){setPending(null);setMessage(value.sessionId&&value.visibility==='public'?'Saved “'+value.title+'” to the public sets page.':'Saved “'+value.title+'” privately to your account.');await refresh();}}
  catch(error){if(alive.current&&!abort.signal.aborted)setMessage(error instanceof Error?error.message:'Saving interrupted. Retry below.');}
  finally{active.current=false;if(alive.current)setBusy(false);if(controller.current===abort)controller.current=null;}
 }
 useEffect(()=>{
  alive.current=true;if(owner){void refresh().then(async()=>{const p=await pendingSet(owner);if(alive.current&&p){setPending(p);setMessage('A recording is waiting to save. Retry below.');}}).catch(e=>{if(alive.current)setMessage(e.message);});}
  return()=>{alive.current=false;controller.current?.abort();};
 },[owner]);
 useEffect(()=>{
  if(!owner||!take||busy||pending||handled.current===take)return;handled.current=take;
  void stageSet(owner,take).then(value=>{if(alive.current){setPending(value);void save(value);}}).catch(e=>{if(alive.current){handled.current=null;setMessage(e.message);}});
 },[take,owner,busy,pending]);
 async function remove(id:string){
  if(active.current)return;active.current=true;setBusy(true);
  try{await recordingAPI('/'+id,{owner},undefined,'DELETE');if(pending?.id===id&&owner){await forgetSet(owner,id);setPending(null);}await refresh();setMessage('Saved recording deleted.');}
  catch(e){setMessage(e instanceof Error?e.message:'Deletion could not finish. Try again.');}finally{active.current=false;setBusy(false);}
 }
 async function withdraw(id:string){if(active.current)return;active.current=true;setBusy(true);try{await recordingAPI('/'+id+'/withdraw',{owner});await refresh();setMessage('Removed from the public page. Existing playback links expire within five minutes.');}catch(e){setMessage(e instanceof Error?e.message:'Could not remove the public listing.');}finally{active.current=false;setBusy(false);}}
 async function discard(){if(!pending||!owner||active.current)return;active.current=true;setBusy(true);
  try{const result=await fetch('/api/ai-dj/recordings/'+pending.id,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({owner})});if(!result.ok&&result.status!==404)throw Error('Could not cancel the saved copy. Retry when connected.');await forgetSet(owner,pending.id);setPending(null);setMessage('Pending save discarded.');await refresh();}
  catch(e){setMessage(e instanceof Error?e.message:'Could not discard save.');}finally{active.current=false;setBusy(false);}
 }
 return <section className="aidj-recording" aria-label="Saved sets"><div className="aidj-record-heading"><h2>Saved sets</h2><span>Your recordings</span></div>
  {!owner?<p><a href="/account/sign-in">Sign in</a> to save your recordings and listen again later.</p>:<>
   <small>Finished recordings save automatically. Keep this page open until saving completes.</small>
   {pending&&<div className="aidj-record-actions"><button disabled={busy} onClick={()=>void save(pending)}>Retry save</button><button disabled={busy} onClick={()=>void discard()}>Discard pending save</button></div>}
   <p role="status">{message}</p>
   {items.length===0&&<p>No saved sets yet.</p>}
   <ul className="aidj-saved-list">{items.map(item=><li key={item.id}><strong>{item.title}</strong><small>{item.visibility==='private'?'Private':item.withdrawn_at?'Not listed':'Public'}</small><span>{item.interrupted?'Interrupted · ':''}{item.seconds<60?`${Math.round(item.seconds)} sec`:`${Math.round(item.seconds/60)} min`} · {new Date(item.created_at).toLocaleDateString()}</span>
    {item.state==='ready'?<><audio controls preload="none" aria-label={'Play '+item.title} src={'/api/ai-dj/recordings/'+item.id+'/audio'}/><a href={'/api/ai-dj/recordings/'+item.id+'/audio?download=1'}>Download set</a><details><summary>Rate this set</summary><SongFeedback id={item.id} product="sets" account/></details></>:<span>{item.state==='deleting'?'Deletion needs retry':'Saving not completed'}</span>}
    {item.visibility==='public'&&!item.withdrawn_at&&<button disabled={busy} onClick={()=>void withdraw(item.id)}>Remove from public page</button>}
    <button disabled={busy} onClick={()=>void remove(item.id)} aria-label={'Delete saved set '+item.title}>Delete saved set</button></li>)}</ul>
  </>}
 </section>;
}
