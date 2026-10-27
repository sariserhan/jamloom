import {timingProbe,findProbe,timingResult} from './audio-timing.js';
const $=id=>document.getElementById(id);let run=null;
function stop(message='Stopped. Microphone off.'){
 const old=run;run=null;if(old){clearTimeout(old.timer);old.stream?.getTracks().forEach(t=>t.stop());for(const source of old.probes??[])try{source.stop();}catch{}old.capture?.port.close();old.source?.disconnect();old.capture?.disconnect();void old.context.close().catch(()=>{});}
 $('start').disabled=false;$('stop').disabled=true;$('status').textContent=message;
}
$('stop').onclick=()=>stop();
$('start').onclick=async()=>{
 if(run)return;const current={context:new AudioContext({latencyHint:'interactive'}),probes:[]};run=current;$('start').disabled=true;$('stop').disabled=false;$('result').textContent='';$('status').textContent='Allow the microphone, then stay quiet.';
 current.timer=setTimeout(()=>{if(run===current)stop('Timed out. Microphone off.');},15000);
 try{
  const c=current.context;await c.resume();if(run!==current)return;
  current.stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
  if(run!==current){current.stream.getTracks().forEach(t=>t.stop());return;}
  const track=current.stream.getAudioTracks()[0],settings=track.getSettings();track.addEventListener('ended',()=>{if(run===current)stop('Microphone disconnected.');});
  await c.audioWorklet.addModule('singing-capture-worklet.js');if(run!==current)return;
  const capture=current.capture=new AudioWorkletNode(c,'jamloom-singing-capture'),source=current.source=c.createMediaStreamSource(current.stream),mute=c.createGain();mute.gain.value=0;source.connect(capture);capture.connect(mute);mute.connect(c.destination);
  const began=c.currentTime+.5,times=Array.from({length:5},(_,i)=>began+i*.8),matches=new Map();
  for(const at of times){const buffer=c.createBuffer(1,Math.round(c.sampleRate*.02),c.sampleRate);buffer.copyToChannel(timingProbe(c.sampleRate),0);const probe=c.createBufferSource();probe.buffer=buffer;probe.connect(c.destination);probe.start(at);current.probes.push(probe);}
  $('status').textContent='Five chirps · stay quiet';
  capture.port.onmessage=({data})=>{if(run!==current)return;try{
   const end=data.frame/data.rate,start=(data.frame-data.samples.length)/data.rate;
   if(times.some(t=>end>=t&&start<=t+.5)){
    const match=findProbe(data.samples,data.rate);if(match){const heard=start+match.offset/data.rate,index=times.findIndex(t=>heard>=t&&heard<=t+.5);if(index>=0&&(!matches.has(index)||matches.get(index).score<match.score))matches.set(index,{delay:heard-times[index],score:match.score});}
   }
   if(end>times.at(-1)+.65){const delays=[...matches.values()].map(m=>m.delay),result=timingResult(delays);$('result').textContent=JSON.stringify({status:result?'MEASURED':'INCONCLUSIVE',...result,delaysMs:delays.map(n=>n*1000),input:{label:track.label,sampleRate:c.sampleRate,echoCancellation:settings.echoCancellation,noiseSuppression:settings.noiseSuppression,autoGainControl:settings.autoGainControl},limitation:'Combined speaker-room-microphone path; no screen latency, singing accuracy or automatic lesson adjustment. No audio retained.'},null,2);stop(result?'Measured. Microphone off.':'Could not match four stable chirps. Check speaker volume and input, then retry.');}
  }finally{if(run===current)capture.port.postMessage('ack');}};
  capture.onprocessorerror=()=>{if(run===current)stop('Audio capture failed.');};
  c.addEventListener('statechange',()=>{if(run===current&&c.state!=='running')stop('Audio interrupted.');});
 }catch(error){if(run===current)stop(error.name==='NotAllowedError'?'Microphone denied. Allow it to measure timing.':'Timing check failed. Microphone off.');}
};
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',()=>stop());
