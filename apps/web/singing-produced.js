import {singingRecordings,recordingAsset} from './singing-recordings.js';
import {detectPitch,isSingingPitch} from './singing-pitch.js';
import {drawSingingChart} from './singing-chart.js';
import {recordedCapturePosition} from './singing-recording.js';
import {noteName} from './instrument-rack.js';
const $=id=>document.getElementById(id),params=new URL(location.href).searchParams,mobile=params.get('mobile')==='1';
const id=params.get('lesson')||location.pathname.split('/').filter(Boolean).at(-1),song=singingRecordings.find(s=>s.id===id);
const link=id=>mobile?`./singing.html?mobile=1&lesson=${id}`:`/singing-academy/lessons/${id}`;
document.body.classList.add('song-lesson','produced-lesson');document.title=song.title+' · Jamloom Singing Academy';
$('lesson-title').textContent=song.title;$('lesson-label').textContent=song.style+' / Original Jamloom recording';
$('instruction').textContent='Hear the singer, then take the lead over the same backing. Watch your voice move as you sing.';
for(const id of ['course-meter','tempo-settings','backing-settings','find-register','register-result','notes','lyric-next','hold-progress','hold-label','practice-weakest'])$(id).hidden=true;
$('register').parentElement.hidden=true;document.querySelector('.pitch-scale').hidden=true;
$('course-progress').textContent='Open practice · no completion grade';
$('lesson-picker').replaceChildren();for(const item of singingRecordings){const option=document.createElement('option');option.value=item.id;option.textContent=item.title;$('lesson-picker').append(option);}$('lesson-picker').value=id;
$('lesson-picker').onchange=()=>{stop();location.href=link($('lesson-picker').value);};
$('demo').textContent='♪ Hear singer';$('start').textContent='🎤 Sing karaoke';$('stop').textContent='■ Stop';
$('instruction').after(document.querySelector('.actions'));
$('section-settings').hidden=false;$('section').replaceChildren();
for(const [value,label] of [['all','Full recording'],['0','0:00 – 0:30'],['30','0:30 – 1:00'],['60','1:00 – 1:30'],['90','1:30 – 2:00']]){const option=document.createElement('option');option.value=value;option.textContent=label;$('section').append(option);}
const repeatLabel=document.createElement('label'),repeat=document.createElement('input');repeat.type='checkbox';repeat.id='repeat-passage';repeatLabel.append(repeat,document.createTextNode('Repeat selected passage'));$('section-settings').after(repeatLabel);
const media=document.createElement('audio');media.id='recording-player';media.controls=true;media.preload='metadata';media.setAttribute('aria-label',song.title+' player');media.muted=!!window.jamloomMobileMuted&&window.jamloomMobileMuteMode!=='volume';if(window.jamloomMobileMuted)media.volume=0;$('section-settings').before(media);
$('live-chart').hidden=false;$('full-lyrics').hidden=false;$('full-lyrics-title').textContent='Original lyric sheet';
$('lesson-tip').textContent='Use headphones. Match the singer by ear, or sing in a comfortable octave. These recordings have live pitch feedback, without a verified note-by-note grade.';
$('feedback').textContent='Listen first, then sing when you are ready.';
const explanation=document.createElement('p');explanation.className='tip';explanation.textContent='The recorded performance includes variations. Follow the singer by ear; these words are not synchronized.';$('full-lyrics-title').after(explanation);
fetch(recordingAsset(id,'lyrics',mobile)).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{if(typeof data.text!=='string'||data.text.length>16000)throw Error();for(const line of data.text.split('\n')){const p=document.createElement('p');p.textContent=line;$('full-lyrics-list').append(p);}}).catch(()=>{$('full-lyrics-list').textContent='The lyric sheet could not load. Reopen this song to try again.';});
let run=null,token=0,raf=0,trace=[],root=57,starting=false,mode='song',ignorePause=false,startupTimer=0;
const bounds=()=>$('section').value==='all'?[0,song.seconds]:[Number($('section').value),Number($('section').value)+30];
function stopMic(){clearTimeout(startupTimer);startupTimer=0;token++;const old=run;run=null;if(old){old.stream?.getTracks().forEach(t=>t.stop());old.input?.disconnect();old.capture?.port.postMessage('stop');old.capture?.port.close();old.capture?.disconnect();old.mute?.disconnect();void old.context.close().catch(()=>{});}$('mic-state').textContent='Microphone off';$('mic-state').classList.remove('live');}
function stop(message='Stopped. Your microphone is off.') {stopMic();if(!media.paused)ignorePause=true;media.pause();cancelAnimationFrame(raf);starting=false;$('demo').disabled=false;$('start').disabled=false;$('stop').disabled=true;$('feedback').textContent=message;}
function draw(){cancelAnimationFrame(raf);const [from,to]=bounds();
 if(!media.paused&&media.currentTime>=to-.025){if(repeat.checked){media.currentTime=from;trace=[];}else{stop('Passage finished. Listen or sing again whenever you like.');return;}}
 drawSingingChart($('live-chart'),[],media.currentTime,trace,root);if(!media.paused)raf=requestAnimationFrame(draw);
}
media.addEventListener('play',()=>{$('stop').disabled=false;draw();});
media.addEventListener('pause',()=>{if(ignorePause){ignorePause=false;return;}if(starting)return;stopMic();cancelAnimationFrame(raf);$('start').disabled=false;$('demo').disabled=false;$('feedback').textContent='Paused. Choose Sing karaoke to resume with your microphone.';});
media.addEventListener('seeking',()=>{trace=[];if(run)run.minimumFrame=run.context.currentTime*run.context.sampleRate;draw();});
media.addEventListener('seeked',draw);
media.addEventListener('ended',()=>{if(repeat.checked){media.currentTime=bounds()[0];void media.play().catch(()=>stop('Press play to repeat.'));}else stop('Practice finished. Repeat whenever you like.');});
media.addEventListener('error',()=>stop('The recording could not load. Reopen this song and try again.'));
$('section').onchange=()=>{stop();trace=[];media.currentTime=bounds()[0];draw();};
async function start(sing){
 stop();starting=true;trace=[];const attempt=token;$('demo').disabled=true;$('start').disabled=true;$('stop').disabled=false;$('feedback').textContent=sing?'Preparing your microphone…':'Loading the singer…';
 startupTimer=setTimeout(()=>{if(attempt===token)stop('Starting this song timed out. Your microphone is off. Check your connection and try again.');},30000);
 let stream;try{
  const next=sing?'karaoke':'song',position=mode===next?media.currentTime:bounds()[0];
  if(mode!==next||!media.getAttribute('src')){mode=next;media.src=recordingAsset(id,next,mobile);media.load();}
  media.currentTime=position>=bounds()[1]||position<bounds()[0]?bounds()[0]:position;
  media.setAttribute('aria-label',song.title+(sing?' karaoke':' sung recording'));
  if(sing){
   const context=new AudioContext({latencyHint:'interactive'}),current={context};run=current;
   await context.resume();if(attempt!==token)return;stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
   if(attempt!==token){stream.getTracks().forEach(t=>t.stop());return;}current.stream=stream;
   await context.audioWorklet.addModule(new URL('./singing-capture-worklet.js',import.meta.url));if(run!==current)return;
   current.capture=new AudioWorkletNode(context,'jamloom-singing-capture');current.mute=context.createGain();current.mute.gain.value=0;current.input=context.createMediaStreamSource(stream);current.input.connect(current.capture);current.capture.connect(current.mute);current.mute.connect(context.destination);current.minimumFrame=context.currentTime*context.sampleRate;
   current.capture.port.onmessage=({data})=>{if(run!==current)return;try{
    if(data.frame-data.samples.length<current.minimumFrame)return;
    const at=recordedCapturePosition(media,context,data.frame,data.samples.length);if(at===null)return;
    const pitch=detectPitch(data.samples,data.rate),note=isSingingPitch(pitch)?69+12*Math.log2(pitch.frequency/440):null;
    if(note!==null){root=Math.max(33,Math.min(81,Math.floor(note/12)*12-3));$('feedback').textContent=`${noteName(Math.round(note))} · ${Math.round(pitch.frequency)} Hz`;}else $('feedback').textContent='Sing a clear, comfortable note';
    trace.push({at,note,good:false});if(trace.length>1200)trace.splice(0,600);
   }finally{if(run===current)current.capture.port.postMessage('ack');}};
   current.capture.onprocessorerror=()=>{if(run===current)stop('Microphone analysis was interrupted. Try again.');};stream.getTracks().forEach(t=>t.addEventListener('ended',()=>{if(run===current)stop('Microphone disconnected. Reconnect and try again.');},{once:true}));
   context.addEventListener('statechange',()=>{if(run===current&&context.state!=='running')stop('Audio paused. Start again when ready.');});
   $('mic-state').textContent='Microphone listening';$('mic-state').classList.add('live');
  }
  if(attempt!==token)return;await media.play();if(attempt!==token)return;clearTimeout(startupTimer);startupTimer=0;starting=false;$('demo').disabled=false;$('start').disabled=false;$('feedback').textContent=sing?'Sing with the backing · your pitch appears below':'Listen to the recorded singer';
 }catch(error){stream?.getTracks().forEach(t=>t.stop());if(attempt===token)stop(error.name==='NotAllowedError'?'Allow microphone and playback access, then try again.':error.message||'Could not start this song.');}
}
$('demo').onclick=()=>start(false);$('start').onclick=()=>start(true);$('stop').onclick=()=>stop();
$('help').onclick=()=>{stop();$('guide').showModal();};$('close-help').onclick=()=>$('guide').close();
for(const p of [...$('guide').querySelectorAll('p')])p.remove();for(const text of ['Hear singer plays the complete recorded performance. Sing karaoke plays the matching instrumental and opens your microphone. Use headphones so the backing does not enter the microphone.','The moving line shows your measured pitch. These recordings are open practice: there is no grade, target melody or completion score. The original lyric sheet may differ from the sung performance.','Choose a thirty-second passage and Repeat selected passage to practice it. The player supports pause and seeking. Pausing turns the microphone off; choose Sing karaoke to start listening again.','Stop, opening this guide, leaving the page or switching tabs stops playback and the microphone. No voice is saved or uploaded. Existing course progress stays unchanged.']){const p=document.createElement('p');p.textContent=text;$('guide').append(p);}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',()=>stop());window.jamloomSingingStop=stop;draw();
