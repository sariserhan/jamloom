import {useEffect,useRef,useState,type RefObject} from 'react';
import {attachSetRecording} from '../../../web/set-recording.js';
import {SavedSets} from './saved-sets';
import type {RecordedSet} from '../../lib/dj-recording-upload';
import type {AIDJPlayer,DJSnapshot} from '../../lib/ai-dj-player';
import {DJStreamUpload,pendingStream,forgetStream,type StreamTake} from '../../lib/dj-stream-upload';

export type DJRecordingControls=ReturnType<typeof attachSetRecording>;
export function DJRecording({player,status,controls,title,owner,sessionId,visibility}:{owner:string|null;sessionId?:string;visibility?:'public'|'private';title:RefObject<string>;player:RefObject<AIDJPlayer|null>;status:DJSnapshot['status'];controls:RefObject<DJRecordingControls|null>}){
 const root=useRef<HTMLElement>(null),[take,setTake]=useState<RecordedSet|null>(null);
 const stream=useRef<DJStreamUpload|null>(null),[streamMessage,setStreamMessage]=useState(''),[pending,setPending]=useState<StreamTake|null>(null),[saving,setSaving]=useState(false),[settling,setSettling]=useState(false),[savedVersion,setSavedVersion]=useState(0);
 useEffect(()=>{
  const host=root.current!;
  const element=(id:string)=>host.querySelector('#'+id);
  const canStart=()=>['loading','playing','closing'].includes(player.current?.snapshot().status??'');
  let alive=true;
  const uploader=owner&&sessionId?new DJStreamUpload(owner,sessionId,title.current,message=>{if(alive){setStreamMessage(message);void pendingStream(owner).then(p=>{if(alive)setPending(p);}).catch(e=>{if(alive)setStreamMessage(e.message);});}},()=>{if(alive){element('set-record-status')!.textContent='Your recording is ready in Saved sets.';setPending(null);setSavedVersion(v=>v+1);}}):null;stream.current=uploader;
  if(owner&&sessionId)void pendingStream(owner).then(p=>{if(alive)setPending(p);}).catch(e=>{if(alive)setStreamMessage(e.message);});
  const recording=attachSetRecording({element,canStart,getTitle:()=>title.current,getVisibility:()=>visibility??'private',onComplete:(take:RecordedSet)=>{if(['playing','closing'].includes(player.current?.snapshot().status??''))player.current?.stop('Local recording limit reached. Test set stopped.');setTake({...take,receipt:{...take.receipt,...(sessionId?{sessionId,visibility}:{})}});},
   streamSink:uploader,
   graph:()=>{if(!canStart())throw Error('Start the set before recording.');},
   context:()=>player.current!.context,mixer:()=>player.current!.mixer,emit:(event:{action:string})=>{if(event.action==='recording.cancel'){setTake(null);if(['playing','closing','paused'].includes(player.current?.snapshot().status??''))player.current?.stop('Recording interrupted. Test set stopped.');}},
   workletURL:'/studio/set-meter-worklet.js',
   onHidden:(callback:()=>void)=>{const hidden=()=>{if(document.hidden)callback();};document.addEventListener('visibilitychange',hidden);return()=>document.removeEventListener('visibilitychange',hidden);},
  });
  controls.current=recording;
  if(uploader)element('set-record-status')!.textContent='Your set records automatically when playback starts.';
  return()=>{alive=false;recording.dispose();uploader?.dispose();stream.current=null;controls.current=null;};
 },[player,controls,title,sessionId,visibility,owner]);
 useEffect(()=>{
  if(status==='stopped'||status==='error'){
   setSettling(true);void(async()=>{try{const current=player.current;if(current?.context.state==='suspended')await current.context.resume();if(current?.context.state==='running')await controls.current?.stop();else controls.current?.interrupt();}catch{controls.current?.interrupt();}finally{setSettling(false);if(owner&&sessionId)void pendingStream(owner).then(setPending).catch(e=>setStreamMessage(e.message));}})();
  }
  controls.current?.refresh();
  if(owner&&sessionId&&!['loading','playing','closing','paused'].includes(status))void pendingStream(owner).then(setPending).catch(e=>setStreamMessage(e.message));
 },[status,controls,player]);
 async function recover(){if(!pending||!stream.current||saving)return;setSaving(true);try{if(pending.complete)await stream.current.retry(pending);else await stream.current.recover(pending);}catch(e){setStreamMessage(e instanceof Error?e.message:'Could not recover this recording.');}finally{setSaving(false);}}
 async function discard(){if(!pending||!owner||saving)return;setSaving(true);try{const response=await fetch('/api/ai-dj/recordings/'+pending.id,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({owner})});if(!response.ok&&response.status!==404)throw Error('Could not remove the saved copy. Retry when connected.');await forgetStream(owner,pending.id);setPending(null);setStreamMessage('Pending recording removed.');setSavedVersion(v=>v+1);}catch(e){setStreamMessage(e instanceof Error?e.message:'Could not remove this recording.');}finally{setSaving(false);}}
 return <><section ref={root} className="aidj-recording" aria-label="Set recording">
  <div className="aidj-record-heading"><h2>Set recording</h2><span>Automatic · {sessionId?`${visibility} · saves as you play`:'local test · 60 min max'}</span></div>
  <input id="set-record-consent" type="checkbox" defaultChecked hidden readOnly/>
  <div className="aidj-record-actions"><button id="set-record-start" hidden disabled>● Record set</button><button id="set-record-stop" hidden disabled>■ Finish recording</button><button id="set-record-delete" hidden={!!sessionId||['loading','playing','closing','paused'].includes(status)} disabled>Delete local copy</button></div>
  <p id="set-record-status" role="status">Your set records automatically when playback starts.</p>
  <audio id="set-record-player" controls preload="none" hidden aria-label="Recorded AI DJ set"/>
  <div className="aidj-record-actions"><a id="set-record-download" download hidden>↓ Download recording</a><a id="set-record-details" download="jamloom-set-details.json" hidden>Download recording details</a></div>
  <small>Pause keeps the same recording. Stop finishes it. {sessionId?(visibility==='public'?'Your full set will appear on the public page.':'Your full set stays private.'):'Local-file tests stay private and use no credits.'}</small>
  {sessionId&&<><p role="status">{streamMessage}</p>{pending&&!settling&&!['loading','playing','closing','paused'].includes(status)&&<div className="aidj-record-actions"><button disabled={saving} onClick={()=>void recover()}>{pending.complete?'Retry save':'Recover captured audio'}</button><button disabled={saving} onClick={()=>void discard()}>Discard pending recording</button>{!pending.complete&&<small>This recording was interrupted. Recovery keeps the captured audio off the public page.</small>}</div>}</>}
  </section><SavedSets key={savedVersion} owner={owner} take={sessionId?null:take}/></>;
}
