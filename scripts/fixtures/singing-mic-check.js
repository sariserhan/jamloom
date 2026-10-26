import {detectPitch,isSingingPitch} from './singing-pitch.js';
import {drawSingingChart} from './singing-chart.js';
const $=id=>document.getElementById(id),phases=['Stay quiet · room noise','Sing a comfortable sustained note','Sing the same note more softly','Add gentle vibrato'];
let context,run=null,token=0,raf=0,inputRecorder,inputStream,inputTimer,inputURL,inputCapture;const completedRuns=new Map();
const percentile=(values,p)=>values.length?[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.floor(values.length*p))]:null;
function stop(){token++;clearInputCheck();const old=run;run=null;cancelAnimationFrame(raf);if(old){old.stream.getTracks().forEach(t=>t.stop());old.input.disconnect();old.capture.port.postMessage('stop');old.capture.port.close();old.capture.disconnect();old.mute.disconnect();const r={completed:old.elapsed>=30,sampleRate:context.sampleRate,input:old.inputInfo,pitchDetectionMeaning:'Periodic sound detected; not identification of a human voice',frames:old.frames,phases:phases.map((phase,i)=>({phase,frames:old.rows[i].length,detectedVoicePercent:old.rows[i].length?100*old.rows[i].filter(x=>x.valid).length/old.rows[i].length:null,medianRms:percentile(old.rows[i].map(x=>x.rms),.5),medianAcRms:percentile(old.rows[i].map(x=>x.acRms),.5),medianDcOffset:percentile(old.rows[i].map(x=>x.dc),.5),clippedFrames:old.rows[i].filter(x=>x.clipped).length,medianConfidence:percentile(old.rows[i].filter(x=>x.confidence!==null).map(x=>x.confidence),.5),medianDetectedHz:percentile(old.rows[i].filter(x=>x.valid).map(x=>x.hz),.5),rejected:{quiet:old.rows[i].filter(x=>!x.valid&&x.acRms<.003).length,noStablePitch:old.rows[i].filter(x=>!x.valid&&x.acRms>=.003&&x.confidence===null).length,lowConfidence:old.rows[i].filter(x=>!x.valid&&x.confidence!==null).length}})),softwareWindowCenterToAnimationMs:{median:percentile(old.delays,.5),p95:percentile(old.delays,.95)},limitation:'Not physical microphone-to-display latency or independently labelled singing accuracy'};if(r.completed)completedRuns.set(r.input.reportedMacMicMode+':'+r.input.requestedProcessing,r);const mode=r.input.reportedMacMicMode,raw=completedRuns.get(mode+':raw'),browser=completedRuns.get(mode+':browser');const comparison=raw&&browser?{unprocessed:raw,browserProcessed:browser}:r;$('result').textContent=JSON.stringify(comparison,null,2);window.jamloomMicCheckResult=r;window.jamloomMicComparisonCount=completedRuns.size;}if(context?.state==='running')void context.suspend();$('start').disabled=false;$('stop').disabled=true;$('device').disabled=false;$('processing').disabled=false;$('mic-mode').disabled=false;$('phase').textContent='Microphone off';}
function draw(){const r=run;if(!r)return;r.elapsed=context.currentTime-r.began;const phase=Math.min(3,Math.floor(r.elapsed/7.5));$('phase').textContent=phases[phase]+' · '+Math.max(0,Math.ceil(30-r.elapsed))+'s';if(r.pending){r.delays.push(r.pending.age+performance.now()-r.pending.at);r.pending=null;}$('pitch').textContent=r.pitch?Math.round(r.pitch.frequency)+' Hz':'Listening for a clear note';drawSingingChart($('live-chart'),[],r.elapsed,r.trace,57);if(r.elapsed>=30)stop();else raf=requestAnimationFrame(draw);}
$('stop').onclick=stop;
$('start').onclick=async()=>{
 stop();const attempt=token;$('start').disabled=true;$('device').disabled=true;$('processing').disabled=true;$('mic-mode').disabled=true;$('result').textContent='';window.jamloomMicCheckResult=null;let stream;
 const processed=$('processing').value==='processed',device=$('device').value;const constraints={channelCount:1,echoCancellation:processed,autoGainControl:false,noiseSuppression:processed,...(device?{deviceId:{exact:device}}:{})};
 try{
  if(!context){context=new AudioContext({latencyHint:'interactive'});context.addEventListener('statechange',()=>{if(context.state!=='running'&&run)stop();});}await context.resume();stream=await navigator.mediaDevices.getUserMedia({audio:constraints});
  if(attempt!==token){stream.getTracks().forEach(t=>t.stop());return;}
  await context.audioWorklet.addModule('singing-capture-worklet.js');if(attempt!==token){stream.getTracks().forEach(t=>t.stop());return;}
  const capture=new AudioWorkletNode(context,'jamloom-singing-capture'),input=context.createMediaStreamSource(stream),mute=context.createGain();mute.gain.value=0;input.connect(capture);capture.connect(mute);mute.connect(context.destination);
  const track=stream.getAudioTracks()[0],settings=track.getSettings();const inputInfo={reportedMacMicMode:$('mic-mode').value,requestedProcessing:processed?'browser':'raw',label:track.label,sampleRate:settings.sampleRate??null,channelCount:settings.channelCount??null,echoCancellation:settings.echoCancellation??null,noiseSuppression:settings.noiseSuppression??null,autoGainControl:settings.autoGainControl??null};$('input').textContent='Input: '+(track.label||'Browser-selected microphone');
  // Device IDs are ephemeral UI choices, never retained in results or storage.
  if(navigator.mediaDevices.enumerateDevices){const devices=await navigator.mediaDevices.enumerateDevices();if(attempt!==token){stream.getTracks().forEach(t=>t.stop());input.disconnect();capture.port.close();capture.disconnect();mute.disconnect();return;}$('device').replaceChildren(new Option('System default',''),...devices.filter(d=>d.kind==='audioinput').map(d=>new Option(d.label||'Microphone',d.deviceId)));$('device').value=settings.deviceId??device;}

  const r=run={stream,capture,input,mute,inputInfo,began:context.currentTime,elapsed:0,frames:0,rows:[[],[],[],[]],trace:[],delays:[],pending:null,pitch:null};
  capture.port.onmessage=({data})=>{if(run!==r)return;try{const at=context.currentTime-r.began;if(at<0||at>30)return;const started=performance.now(),received=context.currentTime,pitch=detectPitch(data.samples,data.rate),valid=isSingingPitch(pitch);r.frames++;const dc=data.samples.reduce((s,n)=>s+n,0)/data.samples.length,rawPower=data.samples.reduce((s,n)=>s+n*n,0)/data.samples.length;r.rows[Math.min(3,Math.floor(at/7.5))].push({valid,rms:Math.sqrt(rawPower),acRms:Math.sqrt(Math.max(0,rawPower-dc*dc)),dc,clipped:data.samples.some(n=>Math.abs(n)>=.999),confidence:pitch?.confidence??null,hz:pitch?.frequency??null});r.pitch=valid?pitch:null;r.pending={at:started,age:1000*(received-(data.frame-data.samples.length/2)/data.rate)};r.trace.push({at,note:valid?69+12*Math.log2(pitch.frequency/440):null,good:valid});if(r.trace.length>1200)r.trace.splice(0,600);}finally{if(run===r)capture.port.postMessage('ack');}};
  capture.onprocessorerror=()=>{stop();$('phase').textContent='Microphone analysis stopped. Try again.';};stream.getTracks().forEach(t=>t.addEventListener('ended',()=>{if(run===r)stop();},{once:true}));$('stop').disabled=false;draw();
 }catch(error){stream?.getTracks().forEach(t=>t.stop());if(attempt===token){stop();$('phase').textContent=error.name==='NotAllowedError'?'Allow microphone access to run this check.':error.message;}}
};
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',stop);

function stopInputCapture(){
 const capture=inputCapture;inputCapture=null;
 if(capture){capture.input.disconnect();capture.node.port.postMessage('stop');capture.node.port.close();capture.node.disconnect();capture.mute.disconnect();}
 if(context?.state==='running'&&!run)void context.suspend();
}
function clearInputCheck(){
 stopInputCapture();
 clearTimeout(inputTimer);
 const recorder=inputRecorder;inputRecorder=null;
 if(recorder&&recorder.state!=='inactive')recorder.stop();
 inputStream?.getTracks().forEach(t=>t.stop());inputStream=null;
 const player=$('input-player');player.pause();player.removeAttribute('src');player.load();player.hidden=true;
 if(inputURL)URL.revokeObjectURL(inputURL);inputURL=null;
 $('input-record').disabled=false;$('input-clear').disabled=true;$('input-status').textContent='No recording';$('input-result').textContent='';
}
$('input-clear').onclick=()=>{token++;clearInputCheck();};
$('input-record').onclick=async()=>{
 stop();const attempt=token;let stream;
 $('input-record').disabled=true;$('input-clear').disabled=false;$('input-status').textContent='Allow access, then stay silent for five seconds.';
 try{
  if(!window.MediaRecorder)throw Error('Input recording is unavailable in this browser.');
  if(!context){context=new AudioContext({latencyHint:'interactive'});context.addEventListener('statechange',()=>{if(context.state!=='running'&&run)stop();});}await context.resume();
  const device=$('device').value,processed=$('processing').value==='processed';
  stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:processed,noiseSuppression:processed,autoGainControl:false,...(device?{deviceId:{exact:device}}:{})}});
  if(attempt!==token||document.hidden){stream.getTracks().forEach(t=>t.stop());return;}
  inputStream=stream;
  await context.audioWorklet.addModule('singing-capture-worklet.js');
  if(attempt!==token||document.hidden){stream.getTracks().forEach(t=>t.stop());return;}
  const node=new AudioWorkletNode(context,'jamloom-singing-capture'),input=context.createMediaStreamSource(stream),mute=context.createGain(),rawRows=[];
  mute.gain.value=0;input.connect(node);node.connect(mute);mute.connect(context.destination);inputCapture={node,input,mute};
  node.port.onmessage=({data})=>{if(inputCapture?.node!==node)return;try{const pitch=detectPitch(data.samples,data.rate),mean=data.samples.reduce((s,n)=>s+n,0)/data.samples.length,power=data.samples.reduce((s,n)=>s+n*n,0)/data.samples.length;if(rawRows.length<700)rawRows.push({valid:isSingingPitch(pitch),ac:Math.sqrt(Math.max(0,power-mean*mean))});}finally{node.port.postMessage('ack');}};
  node.onprocessorerror=()=>{if(attempt===token){clearInputCheck();$('input-status').textContent='Live input analysis failed. Recording discarded.';}};
  const settings=stream.getAudioTracks()[0].getSettings(),inputInfo={reportedMacMicMode:$('mic-mode').value,requestedProcessing:processed?'browser':'raw',sampleRate:settings.sampleRate??null,echoCancellation:settings.echoCancellation??null,noiseSuppression:settings.noiseSuppression??null,autoGainControl:settings.autoGainControl??null};
  const type=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t=>MediaRecorder.isTypeSupported(t));
  const recorder=inputRecorder=new MediaRecorder(stream,type?{mimeType:type}:undefined),chunks=[];let bytes=0;
  recorder.ondataavailable=e=>{if(attempt!==token||inputRecorder!==recorder)return;bytes+=e.data.size;if(bytes>1024*1024){clearInputCheck();$('input-status').textContent='Input recording exceeded its limit and was discarded.';}else if(e.data.size)chunks.push(e.data);};
  recorder.onstop=async()=>{
   stream.getTracks().forEach(t=>t.stop());clearTimeout(inputTimer);
   if(attempt!==token||inputRecorder!==recorder)return;
   inputRecorder=null;inputStream=null;stopInputCapture();
   if(!bytes){clearInputCheck();$('input-status').textContent='No audio was recorded.';return;}
   const blob=new Blob(chunks,{type:recorder.mimeType});inputURL=URL.createObjectURL(blob);
   $('input-player').src=inputURL;$('input-player').hidden=false;$('input-record').disabled=false;
   $('input-status').textContent='Microphone off. Press Play to hear the input, then Clear when finished.';
   try{
    const decoder=new OfflineAudioContext(1,1,48000),audio=await decoder.decodeAudioData(await blob.arrayBuffer());
    if(attempt!==token||!inputURL)return;
    if(!Number.isFinite(audio.duration)||audio.duration>7)throw Error('Recorded input exceeded its duration limit.');
    const samples=audio.getChannelData(0),size=Math.min(8192,2**Math.ceil(Math.log2(audio.sampleRate*.04))),rows=[];
    for(let at=0;at+size<=samples.length;at+=size){
     const frame=samples.subarray(at,at+size),pitch=detectPitch(frame,audio.sampleRate),mean=frame.reduce((s,n)=>s+n,0)/size,power=frame.reduce((s,n)=>s+n*n,0)/size;
     rows.push({valid:isSingingPitch(pitch),hz:pitch?.frequency,ac:Math.sqrt(Math.max(0,power-mean*mean))});
    }
    const summary={seconds:audio.duration,codec:recorder.mimeType,input:inputInfo,simultaneousLive:{frames:rawRows.length,detectedPitchPercent:rawRows.length?100*rawRows.filter(r=>r.valid).length/rawRows.length:null,medianAcRms:percentile(rawRows.map(r=>r.ac),.5)},frames:rows.length,detectedPitchPercent:rows.length?100*rows.filter(r=>r.valid).length/rows.length:0,medianAcRms:percentile(rows.map(r=>r.ac),.5),medianDetectedHz:percentile(rows.filter(r=>r.valid).map(r=>r.hz),.5),limitation:'Same microphone stream measured live and after encoding; codec and window spacing can differ. Periodic sound is not confirmed singing.'};
    $('input-result').textContent=JSON.stringify(summary,null,2);
   }catch(error){if(attempt===token)$('input-result').textContent='Recording analysis unavailable: '+error.message;}

  };
  recorder.onerror=()=>{if(attempt===token){clearInputCheck();$('input-status').textContent='Input recording failed and was discarded.';}};
  recorder.start(250);$('input-status').textContent='Recording five seconds. Stay silent.';
  inputTimer=setTimeout(()=>{if(inputRecorder===recorder&&recorder.state!=='inactive')recorder.stop();stream.getTracks().forEach(t=>t.stop());},5000);
 }catch(error){stream?.getTracks().forEach(t=>t.stop());if(attempt===token){clearInputCheck();$('input-status').textContent=error.name==='NotAllowedError'?'Allow microphone access to record the input.':error.message;}}
};
