import { studioElement, onStudioHidden } from './studio-windows.js';
import {resumeAudio} from './audio.js';
import {sha256} from './live-take.js';
import {recordingTitle,recordingFileStem} from './set-recording-name.js';
export const SET_SECONDS=3600,SET_BYTES=96*1024*1024;
export function attachSetRecording({graph,context,mixer,emit,element: $=studioElement,onHidden=onStudioHidden,workletURL='./set-meter-worklet.js',canStart=()=>true,getTitle=()=>'',getVisibility=()=> 'private',onComplete=(_take)=>{}}){
 let recorder,destination,meter,sink,chunks=[],bytes=0,url,receiptURL,token=0,timer,loadedContext,summary=null,starting=false;
 let finished=Promise.resolve(),finish,begin;
 function disconnect(){clearTimeout(timer);if(meter){try{mixer().meter.disconnect(meter);}catch{}meter.port.close();meter.disconnect();sink.disconnect();meter=null;}if(destination){try{mixer().meter.disconnect(destination);}catch{}destination.stream.getTracks().forEach(t=>t.stop());destination=null;}}
 function controls(){const active=!!recorder||starting;$('set-record-start').disabled=active||!!url||!$('set-record-consent').checked||!canStart();$('set-record-stop').disabled=recorder?.state!=='recording';$('set-record-delete').disabled=!active&&!url;}
 function clear(message='Set recording removed from this tab. Downloaded copies remain on your device.'){
  token++;if(recorder&&recorder.state!=='inactive')recorder.stop();recorder=null;starting=false;disconnect();chunks=[];bytes=0;summary=null;begin?.(false);begin=null;
  const player=$('set-record-player');player.pause();player.removeAttribute('src');player.load();player.hidden=true;
  for(const key of ['set-record-download','set-record-details']){$(key).hidden=true;$(key).removeAttribute('href');}
  if(url)URL.revokeObjectURL(url);if(receiptURL)URL.revokeObjectURL(receiptURL);url=receiptURL=null;$('set-record-status').textContent=message;emit({action:'recording.cancel'});controls();finish?.();finish=null;
 }
 function stop(){
  if(starting)clear('Recording cancelled before capture started.');
  if(recorder&&['recording','paused'].includes(recorder.state)){$('set-record-stop').disabled=true;$('set-record-status').textContent='Finishing your set…';clearTimeout(timer);timer=setTimeout(()=>clear('Recorder did not finish. Incomplete set discarded.'),8000);meter.port.postMessage({type:'stop'});recorder.stop();}
  return finished;
 }
 /** @returns {Promise<boolean>} */
 function start(){
  if(recorder||starting||url||!$('set-record-consent').checked||!canStart())return Promise.resolve(false);clear('Preparing set recording…');const version=token,title=recordingTitle(getTitle()),fileStem=title?recordingFileStem(title):'jamloom-practice-set';starting=true;finished=new Promise(resolve=>finish=resolve);controls();timer=setTimeout(()=>clear('Recorder did not start. Please try again.'),15000);
  /** @type {Promise<boolean>} */
  const ready=new Promise(resolve=>begin=resolve);void(async()=>{
  try{graph();await resumeAudio(context());if(version!==token)return;
   const type=['audio/webm;codecs=opus','audio/mp4'].find(t=>window.MediaRecorder?.isTypeSupported(t));if(!type)throw Error('Long recordings are unavailable in this browser. Use a browser with Opus or AAC recording support.');
   const audio=context();if(loadedContext!==audio){await audio.audioWorklet.addModule(workletURL);if(version!==token)return;loadedContext=audio;}if(version!==token)return;
   destination=context().createMediaStreamDestination();mixer().meter.connect(destination);
   meter=new AudioWorkletNode(context(),'jamloom-set-meter',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,channelCountMode:'explicit'});
   sink=context().createGain();sink.gain.value=0;mixer().meter.connect(meter);meter.connect(sink);sink.connect(context().destination);
   meter.onprocessorerror=()=>{if(version===token)clear('Audio measurement failed. Incomplete set discarded.');};
   let finishMeter;const measured=new Promise(resolve=>finishMeter=resolve);
   // Audio frames can lag wall time under load; allow five minutes of bounded wall-clock grace for the measured hour.
   meter.port.onmessage=({data})=>{if(version!==token)return;if(data.type==='ready'){if(recorder?.state==='inactive'){recorder.start(1000);starting=false;begin?.(true);begin=null;clearTimeout(timer);timer=setTimeout(stop,(SET_SECONDS+300)*1000);controls();emit({action:'recording.start'});}}else if(data.type==='meter'){
    emit({action:'recording.sample',...data});$('set-record-status').textContent=`Recording ${getVisibility()==='public'?'public':'private'} set · ${Math.floor(data.frames/data.rate)} / ${SET_SECONDS} seconds`;
    if(data.frames/data.rate>=SET_SECONDS)stop();
   }else if(data.type==='stopped'){summary=data;finishMeter(data);}};
   const capture=recorder=new MediaRecorder(destination.stream,{mimeType:type,audioBitsPerSecond:128000});
   capture.ondataavailable=({data})=>{if(version!==token||!data.size)return;bytes+=data.size;if(bytes>SET_BYTES){clear('Recording exceeded the 96 MB safety limit and was discarded.');return;}chunks.push(data);};
   capture.onerror=()=>{if(version===token)clear('Recording failed. Incomplete set discarded; decks remain available.');};
   capture.onstop=async()=>{if(version!==token)return;try{
    let deadline;await Promise.race([measured,new Promise((_,reject)=>{deadline=setTimeout(()=>reject(Error('Audio measurement timed out.')),5000);})]).finally(()=>clearTimeout(deadline));
    if(version!==token)return;const blob=new Blob(chunks,{type});if(!blob.size||!summary?.frames)throw Error('No audio captured.');
    const receipt={version:1,...(title?{title}:{}),frames:summary.frames,rate:summary.rate,gaps:summary.gaps,clockStalls:summary.clockStalls,seconds:summary.frames/summary.rate,bytes:blob.size,mime:type,sha256:await sha256(await blob.arrayBuffer())};
    if(version!==token)return;disconnect();recorder=null;chunks=[];url=URL.createObjectURL(blob);receiptURL=URL.createObjectURL(new Blob([JSON.stringify(receipt,null,2)],{type:'application/json'}));
    $('set-record-download').href=url;$('set-record-download').download=fileStem+'.'+(type.includes('mp4')?'m4a':'webm');$('set-record-download').hidden=false;$('set-record-details').href=receiptURL;$('set-record-details').download=title?fileStem+'-details.json':'jamloom-set-details.json';$('set-record-details').hidden=false;
    $('set-record-player').src=url;$('set-record-player').hidden=false;$('set-record-status').textContent=`${receipt.seconds.toFixed(1)} seconds saved in this tab. Download before leaving.${receipt.gaps?' Audio-clock discontinuity detected; this take cannot pass a set assessment.':''}`;emit({action:'recording.complete',receipt});controls();finish?.();finish=null;try{onComplete({blob,receipt});}catch{$('set-record-status').textContent+=' Account saving could not start; download the local recording.';}
   }catch(e){if(version===token)clear(e.message);}};
   controls();
  }catch(e){if(version===token)clear(e.message);}
 })();return ready;
 }
 $('set-record-start').onclick=start;
 $('set-record-stop').onclick=stop;$('set-record-delete').onclick=()=>clear();$('set-record-consent').onchange=()=>{$('set-record-consent').checked?controls():clear('Recording permission removed. Set discarded.');};
 const interrupt=()=>{if(recorder||starting)clear('Audio or page visibility interrupted. Incomplete set discarded.');};
 const voice=$('phrase-consent'),withdraw=()=>{if(!voice.checked)clear('Voice permission removed. Set discarded.');};
 voice?.addEventListener('change',withdraw);
 const unwatch=onHidden(interrupt),leave=()=>clear();window.addEventListener('pagehide',leave);controls();
 return {interrupt,stop,start,hasTake:()=>!!url,pause(){if(recorder?.state==='recording')recorder.pause();},resume(){if(recorder?.state==='paused')recorder.resume();},refresh:controls,dispose(){clear();unwatch?.();window.removeEventListener('pagehide',leave);voice?.removeEventListener('change',withdraw);for(const id of ['set-record-start','set-record-stop','set-record-delete'])$(id).onclick=null;$('set-record-consent').onchange=null;}};
}
