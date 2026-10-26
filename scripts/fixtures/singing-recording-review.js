import {RecordedSingingScore,recordedCapturePosition} from './singing-recording.js';
import {detectPitch,isSingingPitch} from './singing-pitch.js';
import {drawSingingChart} from './singing-chart.js';
const $=id=>document.getElementById(id),media=$('backing'),song=await(await fetch('song.json')).json();
let context,source,run=null,token=0,raf,trace=[];
const words=song.sections[0].notes.flatMap((n,i)=>n.lyric?[{i,word:n.lyric}]:[]);let word=0;
for(const line of song.lines){const p=document.createElement('p');for(const text of line.split(' ')){const span=document.createElement('span');span.textContent=text;span.dataset.index=words[word++].i;p.append(span,document.createTextNode(' '));}$('lyrics').append(p);}
function stopMic(){token++;const old=run;run=null;if(old){old.stream.getTracks().forEach(t=>t.stop());old.input.disconnect();old.capture.port.postMessage('stop');old.capture.port.close();old.capture.disconnect();old.mute.disconnect();}$('state').textContent='Microphone off';$('sing').disabled=false;}
function stop(){media.pause();stopMic();trace=[];cancelAnimationFrame(raf);if(context?.state==='running')void context.suspend();}
function draw(){cancelAnimationFrame(raf);const at=media.currentTime,index=Math.min(4,Math.floor(at/48)),phrase=song.sections[index].notes,t=at-index*48;
 const n=phrase.findIndex(n=>t>=n.at&&t<n.at+n.duration);$('passage').value=String(index*48);$('lyric').textContent=phrase[n]?.lyric||'♪ Instrumental';
 for(const span of $('lyrics').querySelectorAll('span')){span.classList.toggle('current-word',Number(span.dataset.index)===n);if(Number(span.dataset.index)===n)span.setAttribute('aria-current','true');else span.removeAttribute('aria-current');}
 drawSingingChart($('live-chart'),phrase,t,trace.filter(p=>p.section===index).map(p=>({...p,at:p.at-index*48})),57);
 if(!media.paused&&!media.ended)raf=requestAnimationFrame(draw);
}
media.addEventListener('play',()=>{if(context?.state==='suspended')void context.resume().catch(()=>stop());draw();});
for(const name of ['pause','seeking','waiting'])media.addEventListener(name,()=>{if(media.ended)return;run?.score.interrupt();trace=[];if(name==='pause'&&!media.ended)stopMic();draw();});
media.addEventListener('seeked',()=>{if(run)run.minimumFrame=context.currentTime*context.sampleRate;draw();});
media.addEventListener('error',()=>{stop();$('feedback').textContent='Backing could not load. Reload this local rehearsal.';});
media.addEventListener('ended',()=>{if(run){const result=run.score.finish();$('result').dataset.report=JSON.stringify(result);$('result').textContent=result.passed?'Full rehearsal matched':'Practice finished · review difficult passages';}stop();});
$('stop').onclick=stop;
$('passage').onchange=()=>{media.currentTime=Number($('passage').value);run?.score.interrupt();trace=[];draw();};
$('retry').onclick=()=>{media.currentTime=Math.min(192,Math.floor(media.currentTime/48)*48);run?.score.interrupt();trace=[];draw();};
$('sing').onclick=async()=>{
 stopMic();const attempt=token;$('sing').disabled=true;$('result').textContent='';let stream;
 try{
  if(!context){context=new AudioContext({latencyHint:'interactive'});source=context.createMediaElementSource(media);source.connect(context.destination);context.addEventListener('statechange',()=>{if(context.state!=='running'&&run)stop();});}
  await context.resume();stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:false,autoGainControl:false,noiseSuppression:false}});
  if(attempt!==token){stream.getTracks().forEach(t=>t.stop());return;}
  await context.audioWorklet.addModule('singing-capture-worklet.js');if(attempt!==token){stream.getTracks().forEach(t=>t.stop());return;}
  const capture=new AudioWorkletNode(context,'jamloom-singing-capture'),mute=context.createGain(),input=context.createMediaStreamSource(stream);mute.gain.value=0;input.connect(capture);capture.connect(mute);mute.connect(context.destination);
  run={stream,input,capture,mute,score:new RecordedSingingScore(song.sections,context.sampleRate),minimumFrame:context.currentTime*context.sampleRate};const current=run;
  stream.getTracks().forEach(t=>t.addEventListener('ended',stop,{once:true}));capture.onprocessorerror=()=>{stop();$('feedback').textContent='Microphone analysis stopped. Try again.';};
  capture.port.onmessage=({data})=>{if(run!==current)return;try{
   if(data.frame-data.samples.length<current.minimumFrame)return;
   const at=recordedCapturePosition(media,context,data.frame,data.samples.length);if(at===null)return;
   const pitch=detectPitch(data.samples,data.rate),result=current.score.observe(at,data.frame,pitch);if(!result)return;
   trace.push({at,section:Math.min(4,Math.floor(at/48)),note:isSingingPitch(pitch)?69+12*Math.log2(pitch.frequency/440):null,good:result.cents!==null&&Math.abs(result.cents)<=50});if(trace.length>1200)trace.splice(0,600);
   $('feedback').textContent=result.message;
  }finally{if(run===current)capture.port.postMessage('ack');}};
  if(media.ended)media.currentTime=0;await media.play();if(run!==current)return;$('state').textContent='Microphone listening';draw();
 }catch(error){stream?.getTracks().forEach(t=>t.stop());if(attempt===token){stop();$('feedback').textContent=error.name==='NotAllowedError'?'Allow the microphone to sing along.':error.message;}}
};
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',stop);window.jamloomSingingStop=stop;draw();
