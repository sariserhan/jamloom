import {useEffect,useRef,type RefObject} from 'react';
import {attachSetRecording} from '../../../web/set-recording.js';
import type {AIDJPlayer,DJSnapshot} from '../../lib/ai-dj-player';

export type DJRecordingControls=ReturnType<typeof attachSetRecording>;
export function DJRecording({player,status,controls,title}:{title:RefObject<string>;player:RefObject<AIDJPlayer|null>;status:DJSnapshot['status'];controls:RefObject<DJRecordingControls|null>}){
 const root=useRef<HTMLElement>(null);
 useEffect(()=>{
  const host=root.current!;
  const element=(id:string)=>host.querySelector('#'+id);
  const canStart=()=>['playing','closing'].includes(player.current?.snapshot().status??'');
  const recording=attachSetRecording({element,canStart,getTitle:()=>title.current,
   graph:()=>{if(!canStart())throw Error('Start the set before recording.');},
   context:()=>player.current!.context,mixer:()=>player.current!.mixer,emit:()=>{},
   workletURL:'/studio/set-meter-worklet.js',
   onHidden:(callback:()=>void)=>{const hidden=()=>{if(document.hidden)callback();};document.addEventListener('visibilitychange',hidden);return()=>document.removeEventListener('visibilitychange',hidden);},
  });
  controls.current=recording;
  return()=>{recording.dispose();controls.current=null;};
 },[player,controls,title]);
 useEffect(()=>{
  if(status==='stopped'||status==='error'){
   if(player.current?.context.state==='running')void controls.current?.stop();else controls.current?.interrupt();
  }
  if(status==='paused')controls.current?.interrupt();
  controls.current?.refresh();
 },[status,controls,player]);
 return <section ref={root} className="aidj-recording" aria-label="Record your set">
  <div className="aidj-record-heading"><h2>Record your set</h2><span>Local only · up to 60 minutes</span></div>
  <label className="aidj-record-consent"><input id="set-record-consent" type="checkbox"/><span>I have permission to record this music for private listening.</span></label>
  <div className="aidj-record-actions"><button id="set-record-start" disabled>● Record set</button><button id="set-record-stop" disabled>■ Finish recording</button><button id="set-record-delete" disabled>Delete recording</button></div>
  <p id="set-record-status" role="status">Start your set and confirm permission to record.</p>
  <audio id="set-record-player" controls preload="none" hidden aria-label="Recorded AI DJ set"/>
  <div className="aidj-record-actions"><a id="set-record-download" download hidden>↓ Download recording</a><a id="set-record-details" download="jamloom-set-details.json" hidden>Download recording details</a></div>
  <small>Pause finishes the take. Download before leaving. Recording does not grant training permission.</small>
 </section>;
}
