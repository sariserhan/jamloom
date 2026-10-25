import {useEffect,useRef,useState,type RefObject} from 'react';
import {attachSetRecording} from '../../../web/set-recording.js';
import {SavedSets} from './saved-sets';
import type {RecordedSet} from '../../lib/dj-recording-upload';
import type {AIDJPlayer,DJSnapshot} from '../../lib/ai-dj-player';

export type DJRecordingControls=ReturnType<typeof attachSetRecording>;
export function DJRecording({player,status,controls,title,owner,sessionId,visibility}:{owner:string|null;sessionId?:string;visibility?:'public'|'private';title:RefObject<string>;player:RefObject<AIDJPlayer|null>;status:DJSnapshot['status'];controls:RefObject<DJRecordingControls|null>}){
 const root=useRef<HTMLElement>(null),[take,setTake]=useState<RecordedSet|null>(null);
 useEffect(()=>{
  const host=root.current!;
  const element=(id:string)=>host.querySelector('#'+id);
  const canStart=()=>['loading','playing','closing'].includes(player.current?.snapshot().status??'');
  const recording=attachSetRecording({element,canStart,getTitle:()=>title.current,getVisibility:()=>visibility??'private',onComplete:(take:RecordedSet)=>{if(['playing','closing'].includes(player.current?.snapshot().status??''))player.current?.stop('Local recording limit reached. Test set stopped.');setTake({...take,receipt:{...take.receipt,...(sessionId?{sessionId,visibility}:{})}});},
   graph:()=>{if(!canStart())throw Error('Start the set before recording.');},
   context:()=>player.current!.context,mixer:()=>player.current!.mixer,emit:(event:{action:string})=>{if(event.action==='recording.cancel'){setTake(null);if(['playing','closing','paused'].includes(player.current?.snapshot().status??''))player.current?.stop('Recording interrupted. Test set stopped.');}},
   workletURL:'/studio/set-meter-worklet.js',
   onHidden:(callback:()=>void)=>{const hidden=()=>{if(document.hidden)callback();};document.addEventListener('visibilitychange',hidden);return()=>document.removeEventListener('visibilitychange',hidden);},
  });
  controls.current=recording;
  return()=>{recording.dispose();controls.current=null;};
 },[player,controls,title,sessionId,visibility]);
 useEffect(()=>{
  if(status==='stopped'||status==='error'){
   const current=player.current;if(current?.context.state==='suspended')void current.context.resume().then(()=>controls.current?.stop()).catch(()=>controls.current?.interrupt());else if(current?.context.state==='running')void controls.current?.stop();else controls.current?.interrupt();
  }
  controls.current?.refresh();
 },[status,controls,player]);
 return <><section ref={root} className="aidj-recording" aria-label="Set recording">
  <div className="aidj-record-heading"><h2>Set recording</h2><span>Automatic · {sessionId?visibility:'local test'} · 60 min max</span></div>
  <input id="set-record-consent" type="checkbox" defaultChecked hidden readOnly/>
  <div className="aidj-record-actions"><button id="set-record-start" hidden disabled>● Record set</button><button id="set-record-stop" hidden disabled>■ Finish recording</button><button id="set-record-delete" hidden={['loading','playing','closing','paused'].includes(status)} disabled>Delete local copy</button></div>
  <p id="set-record-status" role="status">Your set records automatically when playback starts.</p>
  <audio id="set-record-player" controls preload="none" hidden aria-label="Recorded AI DJ set"/>
  <div className="aidj-record-actions"><a id="set-record-download" download hidden>↓ Download recording</a><a id="set-record-details" download="jamloom-set-details.json" hidden>Download recording details</a></div>
  <small>Pause keeps the same recording. Stop finishes it. {sessionId?(visibility==='public'?'Your full set will appear on the public page.':'Your full set stays private.'):'Local-file tests stay private and use no credits.'}</small>
 </section><SavedSets owner={owner} take={take}/></>;
}
