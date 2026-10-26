import {createRack,noteName} from './instrument-rack.js';
import {detectPitch} from './singing-pitch.js';
import {SingingHold} from './singing-lesson.js';
const $=id=>document.getElementById(id);
let active=null;
function phase(name){for(const step of ['hear','sing','hold'])$('step-'+step).classList.toggle('active',step===name);}
function resetMeter(){ $('hold-progress').value=0;$('hold-label').textContent='0.0 / 2 seconds';$('needle').hidden=true; }
function stop(message='Stopped. Your microphone is off.'){
 const run=active;active=null;
 if(run){clearTimeout(run.watchdog);run.stream?.getTracks().forEach(t=>t.stop());run.source?.disconnect();run.capture?.port.postMessage('stop');run.capture?.port.close();run.capture?.disconnect();run.rack?.port.postMessage({type:'panic'});run.rack?.disconnect();run.rack?.port.close();run.gain?.disconnect();run.muted?.disconnect();void run.context.close().catch(()=>{});}
 $('mic-state').textContent='Microphone off';$('mic-state').classList.remove('live');$('start').disabled=false;$('stop').disabled=true;$('register').disabled=false;$('start').textContent='↻ Practice again';$('feedback').textContent=message;phase(null);
}
async function start(){
 if(active)return;
 resetMeter();$('result').textContent='';$('start').disabled=true;$('register').disabled=true;$('stop').disabled=false;$('feedback').textContent='Preparing the piano and microphone…';
 let run;
 try{
  if(!navigator.mediaDevices?.getUserMedia||!window.AudioWorkletNode)throw Error('This lesson needs microphone access on HTTPS or localhost.');
  const context=new AudioContext({latencyHint:'interactive'});run={context};active=run;
  run.watchdog=setTimeout(()=>{if(active===run)stop('Preparation timed out. Allow microphone access and try again.');},30000);
  run.gain=context.createGain();run.gain.gain.value=0;run.gain.connect(context.destination);
  if(context.state!=='running')await context.resume();
  if(active!==run)return;
  run.stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
  if(active!==run){run.stream.getTracks().forEach(t=>t.stop());return;}
  run.stream.getTracks().forEach(t=>{t.enabled=false;t.addEventListener('ended',()=>{if(active===run)stop('Microphone disconnected. Reconnect and try again.');},{once:true});});
  run.rack=await createRack(context,run.gain);
  if(active!==run){run.rack.port.postMessage({type:'panic'});run.rack.disconnect();run.rack.port.close();return;}
  await context.audioWorklet.addModule(new URL('./singing-capture-worklet.js',import.meta.url));
  if(active!==run)return;
  if(context.state!=='running')throw Error('Audio is paused. Try starting the lesson again.');
  run.capture=new AudioWorkletNode(context,'jamloom-singing-capture',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]});
  run.muted=context.createGain();run.muted.gain.value=0;run.source=context.createMediaStreamSource(run.stream);run.source.connect(run.capture);run.capture.connect(run.muted);run.muted.connect(context.destination);
  const note=Number($('register').value),now=context.currentTime,listenAt=now+2.2,endAt=listenAt+6;
  const grader=new SingingHold(note,context.sampleRate,Math.ceil(listenAt*context.sampleRate));
  run.gain.gain.setValueAtTime(0,now);run.gain.gain.linearRampToValueAtTime(.3,now+.03);run.gain.gain.setValueAtTime(.3,now+1.1);run.gain.gain.linearRampToValueAtTime(0,now+1.3);
  run.rack.port.postMessage({type:'note',id:1,patch:0,pitch:note,velocity:80});
  $('feedback').textContent='Listen to the piano';$('mic-state').textContent='Microphone ready';phase('hear');
  run.capture.onprocessorerror=()=>{if(active===run)stop('Audio analysis was interrupted. Try again.');};
  run.capture.port.onmessage=({data})=>{
   if(active!==run)return;
   try{
    const at=data.frame/data.rate;
    if(at>=endAt){$('result').textContent='Try again whenever you like. Aim for a gentle, steady hum.';stop('Let’s try once more.');return;}
    if(at>=listenAt&&!run.listening){run.listening=true;run.rack.port.postMessage({type:'panic'});run.stream.getTracks().forEach(t=>t.enabled=true);$('mic-state').textContent='Microphone listening';$('mic-state').classList.add('live');$('feedback').textContent='Your turn · hum the note';phase('sing');}
    if(at-data.samples.length/data.rate<listenAt)return;
    const pitch=detectPitch(data.samples,data.rate),result=grader.observe(data.frame,pitch);
    $('feedback').textContent=result.message;$('hold-progress').value=result.held;$('hold-label').textContent=result.held.toFixed(1)+' / 2 seconds';
    $('needle').hidden=result.cents===null;
    if(result.cents!==null){$('needle').style.left=(50+Math.max(-200,Math.min(200,result.cents))/4)+'%';$('measured').textContent=Math.round(pitch.frequency)+' Hz · '+(result.cents>0?'+':'')+Math.round(result.cents)+' cents';phase(Math.abs(result.cents)<=50?'hold':'sing');}
    else $('measured').textContent='Waiting for a clear note';
    if(result.passed){try{localStorage.setItem('jamloom.singing.first-note.v1','passed');}catch{}$('result').textContent='✓ Lesson complete · unlimited practice unlocked';stop('Matched! You held your note for two seconds.');}
   }finally{if(active===run)run.capture.port.postMessage('ack');}
  };
  clearTimeout(run.watchdog);run.watchdog=setTimeout(()=>{if(active===run)stop('Practice timed out. Restart when ready.');},12000);
  context.addEventListener('statechange',()=>{if(active===run&&context.state!=='running')stop('Audio paused. Restart when ready.');});
 }catch(error){if(!run||active===run)stop(error.name==='NotAllowedError'?'Microphone access was denied. Allow access in your browser, then try again.':error.message||'Could not start the lesson.');}
}
$('start').addEventListener('click',start);$('stop').addEventListener('click',()=>stop());
$('register').addEventListener('change',()=>{$('target-note').textContent=noteName(Number($('register').value));resetMeter();});
$('help').addEventListener('click',()=>{if(active)stop();$('guide').showModal();});$('close-help').addEventListener('click',()=>$('guide').close());
document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)stop('Practice paused while this page was hidden.');});
window.addEventListener('pagehide',()=>{if(active)stop();});
try{if(localStorage.getItem('jamloom.singing.first-note.v1')==='passed')$('result').textContent='✓ Previously completed · practice as often as you like';}catch{}
