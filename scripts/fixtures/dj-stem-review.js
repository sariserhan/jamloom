import {createMixer,setMixerGain} from './mixer.js';
import {waveformPeaks} from './pro-deck-tools.js';
import {scheduleStemPerformance,stemParts} from './stem-performance.js';
const $=id=>document.getElementById(id),targets={drums:'a',bass:'b',other:'rack',vocals:'c'};
let context,active,mixer,buffers,plan,raf=0,token=0;const peaks=new Map();
const time=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
async function assets(ctx){
 const response=await fetch('plan.json');if(!response.ok)throw Error('Cannot load performance plan');
 const p=await response.json(),b={};
 for(const [key,clip] of Object.entries(p.clips)){
  if(!/^(drums|bass|other|vocals)-(a|b|voice)\.wav$/.test(clip.file))throw Error('Invalid local clip');
  const r=await fetch(clip.file);if(!r.ok)throw Error('Missing stem clip');const bytes=await r.arrayBuffer();
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
  if(hash!==clip.sha256)throw Error('Stem clip changed');b[key]=await ctx.decodeAudioData(bytes);
 }
 return {plan:p,buffers:b};
}
function stop(){token++;cancelAnimationFrame(raf);active?.stop();active=null;$('start').disabled=false;$('stop').disabled=true;$('status').textContent='Stopped';for(const part of stemParts)document.querySelector('#'+part+' span').textContent='Stopped';if(context?.state==='running')void context.suspend();}
function draw(){
 if(!active)return;const state=active.snapshot(),seconds=Math.min(plan.seconds,state.seconds);
 $('clock').textContent=time(seconds)+' / '+time(plan.seconds);$('progress').value=seconds;
 $('status').textContent=(plan.scenes.findLast(s=>s.at<=seconds)?.title??'Ready')+' · Beat '+(1+Math.floor(seconds*plan.bpm/60)%4);
 for(const part of stemParts){
  const event=state.active.find(e=>e.part===part),canvas=document.querySelector('#'+part+' canvas'),c=canvas.getContext('2d');
  canvas.width=Math.max(100,Math.round(canvas.clientWidth*devicePixelRatio));canvas.height=Math.round(90*devicePixelRatio);c.clearRect(0,0,canvas.width,canvas.height);
  document.querySelector('#'+part+' span').textContent=event?`${Math.round(event.gain*Number($(part+'-level').value)*100)}% · ${time(event.position)}`:'Rest';
  if(!event)continue;if(!peaks.has(event.clip))peaks.set(event.clip,waveformPeaks(buffers[event.clip]));const data=peaks.get(event.clip);c.strokeStyle=part==='drums'||part==='bass'?'#c7fa77':'#c5a5ff';c.beginPath();
  for(let i=0;i<data.length;i++){const x=i/data.length*canvas.width,h=Math.min(.5,data[i])*canvas.height;c.moveTo(x,canvas.height/2-h);c.lineTo(x,canvas.height/2+h);}c.stroke();
  c.fillStyle='#fff';c.fillRect(event.position/event.duration*canvas.width,0,2*devicePixelRatio,canvas.height);
 }
 if(state.ended){stop();$('status').textContent='Finished';}else raf=requestAnimationFrame(draw);
}
$('start').onclick=async()=>{
 stop();const attempt=token;for(const audio of document.querySelectorAll('audio'))audio.pause();$('start').disabled=true;$('stop').disabled=false;$('status').textContent='Preparing parts…';
 try{
  if(!context){context=new AudioContext({latencyHint:'interactive'});mixer=createMixer(context);context.addEventListener('statechange',()=>{if(active&&context.state!=='running')stop();});}
  await context.resume();if(!buffers){const a=await assets(context);plan=a.plan;buffers=a.buffers;}
  if(attempt!==token)return;
  for(const part of stemParts)setMixerGain(context,mixer,targets[part],Number($(part+'-level').value));
  active=scheduleStemPerformance(context,mixer,plan,buffers,Math.ceil((context.currentTime+.15)*context.sampleRate));draw();
 }catch(error){if(attempt===token){stop();$('status').textContent=error.message;}}
};
$('stop').onclick=stop;
for(const part of stemParts)$(part+'-level').oninput=()=>{if(context&&mixer)setMixerGain(context,mixer,targets[part],Number($(part+'-level').value));};
for(const audio of document.querySelectorAll('audio'))audio.addEventListener('play',()=>{stop();for(const other of document.querySelectorAll('audio'))if(other!==audio)other.pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();for(const audio of document.querySelectorAll('audio'))audio.pause();}});window.addEventListener('pagehide',stop);
// The test renders this exact scheduler silently; never invoked on page load.
export async function renderStudy(){
 const ctx=new OfflineAudioContext(2,211*48000,48000),a=await assets(ctx),mix=createMixer(ctx);
 for(const target of Object.values(targets))mix.gainParams[target].value=.7;
 scheduleStemPerformance(ctx,mix,a.plan,a.buffers,24000);
 return ctx.startRendering();
}
