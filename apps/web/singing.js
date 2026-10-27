import {createRack,noteName} from './instrument-rack.js';
import {detectPitch,isSingingPitch} from './singing-pitch.js';
import {SingingRegister} from './singing-register.js';
import {SingingHold,SingingPhrase} from './singing-lesson.js';
import {singingLessons,singingSongs,stages,lessonById,phraseFor,readProgress,saveAttempt,weakestSection} from './singing-course.js';
import {drawSingingChart} from './singing-chart.js';
import {courseScore,songScore} from './singing-score.js';
const $=id=>document.getElementById(id);
const mobile=new URL(location.href).searchParams.get('mobile')==='1',lessonLink=id=>mobile?'./singing.html?mobile=1&lesson='+encodeURIComponent(id):'/singing-academy/lessons/'+id;
const id=new URL(location.href).searchParams.get('lesson')||location.pathname.split('/').filter(Boolean).at(-1),lesson=lessonById(id)||singingLessons[0],collection=lesson.song?singingSongs:singingLessons,position=collection.indexOf(lesson);
let active=null,lyricIndex=-1;
$('lesson-title').textContent=lesson.title;$('lesson-label').textContent=lesson.song?`${lesson.style} / ${lesson.credit||'Original Jamloom practice song'}`:`Warm-ups / ${stages[lesson.stage]} / ${position+1} of ${singingLessons.length}`;$('instruction').textContent=lesson.instruction;$('lesson-tip').textContent=lesson.tip;document.title=lesson.title+' · Jamloom Singing Academy';
for(const l of collection){const option=document.createElement('option');option.value=l.id;option.textContent=`${collection.indexOf(l)+1}. ${l.title}`;$('lesson-picker').append(option);}$('lesson-picker').value=lesson.id;
$('lesson-picker').onchange=()=>{stop();location.href=lessonLink($('lesson-picker').value);};
$('tempo-settings').hidden=!!lesson.hold;$('backing-settings').hidden=lesson.stage<3||!!lesson.song;
if(lesson.sections)for(const [i,label] of lesson.sections.entries())$('section').querySelector(`option[value="${i}"]`).textContent=label;
if(lesson.song){document.body.classList.add('song-lesson');$('demo').textContent='♪ Hear song';$('start').textContent='🎤 Sing along';$('notes').hidden=true;$('live-chart').hidden=false;$('lyrics').hidden=false;$('lyric-next').hidden=false;$('full-lyrics').hidden=false;$('section-settings').hidden=false;$('song-goal').hidden=false;$('song-goal').textContent=lesson.focus+' · '+lesson.coach;$('backing').checked=true;$('lesson-tip').textContent=lesson.tip;const tempo=$('tempo');tempo.replaceChildren();for(const t of [lesson.tempo-16,lesson.tempo,Math.min(128,lesson.tempo+16)]){const option=document.createElement('option');option.value=t;option.textContent=t+' BPM';tempo.append(option);}tempo.value=String(lesson.tempo);$('instruction').after(document.querySelector('.actions'));}
function phase(name){for(const step of ['hear','sing','hold'])$('step-'+step).classList.toggle('active',step===name);}
function settings(){return {root:Number($('register').value),tempo:Number($('tempo').value),section:lesson.song&&$('section').value!=='all'?Number($('section').value):'all'};}
function renderNotes(){const {root,tempo,section}=settings();const phrase=phraseFor(lesson,root,tempo,section);$('notes').replaceChildren();for(const [i,n] of phrase.entries()){const box=document.createElement('div');box.className='note-block';box.dataset.index=i;box.style.flexGrow=String(n.duration);const name=document.createElement('strong');name.textContent=n.note===null?'—':noteName(n.note);const duration=document.createElement('span');duration.textContent=n.note===null?'Rest':lesson.hold?lesson.hold+' sec':lesson.notes[i][1]+' beat'+(lesson.notes[i][1]===1?'':'s');box.append(name,duration);$('notes').append(box);}$('target-note').textContent=noteName(root);$('measured').textContent='Ready when you are';$('hold-progress').max=lesson.hold||phrase.length;resetMeter();if(lesson.song){drawSingingChart($('live-chart'),phrase,0,[],root);$('full-lyrics-list').replaceChildren();let index=0;const indices=lesson.lyrics.flatMap((word,i)=>word?[i]:[]);for(const line of lesson.lines){const row=document.createElement('p');for(const word of line.split(' ')){const span=document.createElement('span');span.dataset.index=String(indices[index++]);span.textContent=word;row.append(span,document.createTextNode(' '));} $('full-lyrics-list').append(row);}lyricIndex=-1;}}
function highlightLyric(index){
 if(index===lyricIndex)return;lyricIndex=index;const list=$('full-lyrics-list');for(const word of list.querySelectorAll('.current-word')){word.classList.remove('current-word');word.removeAttribute('aria-current');word.parentElement.classList.remove('current-line');}
 const word=list.querySelector(`[data-index="${index}"]`);if(!word)return;word.classList.add('current-word');word.setAttribute('aria-current','true');const row=word.parentElement;row.classList.add('current-line');const top=row.getBoundingClientRect().top-list.getBoundingClientRect().top;if(top<0||top+row.offsetHeight>list.clientHeight)list.scrollTop+=top-list.clientHeight/2+row.offsetHeight/2;
}
function resetMeter(){$('hold-progress').value=0;$('hold-label').textContent=lesson.hold?`0.0 / ${lesson.hold} seconds`:`0 / ${$('hold-progress').max} notes & rests`;$('needle').hidden=true;}
function showProgress(){let progress={};try{progress=readProgress(localStorage);}catch{}const completed=collection.filter(l=>progress[l.id]?.passed).length;$('course-progress').textContent=`${completed} / ${collection.length} ${lesson.song?'songs':'warm-ups'} complete · saved on this device`;$('course-meter').max=collection.length;$('course-meter').value=completed;const next=collection.find(l=>!progress[l.id]?.passed);$('continue').href=lessonLink((next||collection[0]).id);$('continue').textContent=next?'Continue course →':'Practice any lesson →';if(completed===collection.length)$('course-progress').textContent='✦ Section complete · keep singing with unlimited practice';return progress;}
function stop(message='Stopped. Your microphone is off.'){
 const run=active;active=null;
 if(run){clearTimeout(run.watchdog);cancelAnimationFrame(run.raf);run.stream?.getTracks().forEach(t=>t.stop());run.source?.disconnect();run.capture?.port.postMessage('stop');run.capture?.port.close();run.capture?.disconnect();run.rack?.port.postMessage({type:'panic'});run.rack?.disconnect();run.rack?.port.close();run.gain?.disconnect();run.muted?.disconnect();void run.context.close().catch(()=>{});}
 $('mic-state').textContent='Microphone off';$('mic-state').classList.remove('live');for(const id of ['start','demo','find-register','register','tempo','backing','lesson-picker','section'])$(id).disabled=false;$('stop').disabled=true;$('start').textContent=lesson.song?'↻ Sing again':'↻ Practice again';$('feedback').textContent=message;phase(null);
}
function finish(result){
 const score=lesson.hold?(result.passed?100:Math.round(result.held/lesson.hold*100)):result.score;
 const partial=lesson.song&&settings().section!=='all';let saved=true;if(!partial)try{saveAttempt(localStorage,lesson.id,{passed:result.passed,score});}catch{saved=false;}
 $('result').textContent=result.passed?'✓ Lesson complete · practice as often as you like':`Keep practicing · ${score}% matched`;
 if(partial)$('result').textContent=(result.passed?'✓ Section complete':'Keep practicing')+' · '+score+'% matched. Choose Full song to save course progress.';
 if(saved&&!partial&&mobile)window.webkit?.messageHandlers.singingProgress?.postMessage(readProgress(localStorage));
 if(!saved)$('result').textContent+=' · Browser storage unavailable; progress was not saved.';
 $('review').replaceChildren();if(result.details)for(const [i,row] of result.details.entries()){const item=document.createElement('li');item.textContent=`${i+1}. ${row.note===null?'Rest':noteName(row.note)} · ${row.advice}`;$('review').append(item);}
 $('continue').hidden=!result.passed||partial;$('practice-weakest').hidden=!lesson.song||partial||result.passed;if(lesson.song&&!partial){const section=weakestSection(lesson,result.details);$('practice-weakest').textContent='Practice '+(lesson.sections||['first verse','second verse','chorus','finale'])[section];$('practice-weakest').onclick=()=>{$('section').value=String(section);renderNotes();start();};}showProgress();stop(result.passed?'Matched! Repeat or continue to your next lesson.':'Listen again, then try once more.');
}
async function start(demoOnly=false,registerOnly=false){
 if(active)return;$('practice-weakest').hidden=true;resetMeter();if(lesson.song){highlightLyric(-1);$('full-lyrics-list').scrollTop=0;}$('result').textContent='';$('review').replaceChildren();$('continue').hidden=true;for(const id of ['start','demo','find-register','register','tempo','backing','lesson-picker','section'])$(id).disabled=true;$('stop').disabled=false;$('feedback').textContent='Preparing the piano'+(demoOnly?'…':' and microphone…');
 let run;
 try{
  if(!window.AudioWorkletNode||!demoOnly&&!navigator.mediaDevices?.getUserMedia)throw Error('This lesson needs audio support on HTTPS or localhost.');
  const context=new AudioContext({latencyHint:'interactive'});run={context,demoOnly,trace:[]};active=run;run.watchdog=setTimeout(()=>{if(active===run)stop('Preparation timed out. Allow microphone access and try again.');},30000);
  run.gain=context.createGain();run.gain.gain.value=window.jamloomMobileMuted?0:.3;run.gain.connect(context.destination);if(context.state!=='running')await context.resume();if(active!==run)return;
  if(!demoOnly){run.stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:false,noiseSuppression:false,autoGainControl:false}});if(active!==run){run.stream.getTracks().forEach(t=>t.stop());return;}run.stream.getTracks().forEach(t=>{t.enabled=false;t.addEventListener('ended',()=>{if(active===run)stop('Microphone disconnected. Reconnect and try again.');},{once:true});});}
  if(registerOnly){
   await context.audioWorklet.addModule(new URL('./singing-capture-worklet.js',import.meta.url));if(active!==run)return;
   const assessment=new SingingRegister(),began=context.currentTime;
   run.capture=new AudioWorkletNode(context,'jamloom-singing-capture',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]});run.muted=context.createGain();run.muted.gain.value=0;run.source=context.createMediaStreamSource(run.stream);run.source.connect(run.capture);run.capture.connect(run.muted);run.muted.connect(context.destination);
   run.stream.getTracks().forEach(t=>t.enabled=true);$('mic-state').textContent='Microphone listening';$('mic-state').classList.add('live');
   run.capture.onprocessorerror=()=>{if(active===run)stop('Audio analysis was interrupted. Try again.');};
   run.capture.port.onmessage=({data})=>{if(active!==run)return;try{
    const elapsed=data.frame/data.rate-began,pitch=detectPitch(data.samples,data.rate);assessment.observe(elapsed,pitch);
    $('measured').textContent=isSingingPitch(pitch)?noteName(Math.round(69+12*Math.log2(pitch.frequency/440))):'Waiting for a clear note';
    $('feedback').textContent=`Sing gently across comfortable notes · ${Math.max(0,Math.ceil(12-elapsed))} seconds left`;
    if(elapsed>=12){const result=assessment.result(lesson.notes.map(n=>n[0]));stop();
     if(result){$('register').value=String(result.root);renderNotes();$('register-result').textContent=`Heard ${noteName(result.low)}–${noteName(result.high)}. Starting register: ${$('register').selectedOptions[0].textContent}. Try the song and change it if needed; this is not your full vocal range.`;}
     else $('register-result').textContent='Not enough clear singing to suggest a register. Check the microphone, then try again or choose a register yourself.';
    }
   }finally{if(active===run)run.capture.port.postMessage('ack');}};
   clearTimeout(run.watchdog);run.watchdog=setTimeout(()=>{if(active===run)stop('Register check timed out. Try again.');},15000);
   context.addEventListener('statechange',()=>{if(active===run&&context.state!=='running')stop('Audio paused. Restart when ready.');});return;
  }
  run.rack=await createRack(context,run.gain);if(active!==run){run.rack.port.postMessage({type:'panic'});run.rack.disconnect();run.rack.port.close();return;}
  if(!demoOnly){await context.audioWorklet.addModule(new URL('./singing-capture-worklet.js',import.meta.url));if(active!==run)return;}
  const {root,tempo,section}=settings(),phrase=phraseFor(lesson,root,tempo,section),now=context.currentTime,startAt=now+.15;
  const demoPhrase=lesson.hold?[{note:root,at:0,duration:1.3}]:phrase,duration=phrase.at(-1).at+phrase.at(-1).duration,demoEnd=startAt+demoPhrase.at(-1).at+demoPhrase.at(-1).duration;
  const listenAt=lesson.song?startAt:lesson.hold?now+2.2:demoEnd+1+4*60/tempo,endAt=listenAt+(lesson.hold?lesson.hold+4:duration);
  const grader=lesson.hold?new SingingHold(root,context.sampleRate,Math.ceil(listenAt*context.sampleRate),lesson.hold):new SingingPhrase(phrase,context.sampleRate,Math.ceil(listenAt*context.sampleRate));
  run.rack.port.onmessage=({data})=>{if(active===run&&data.type==='score-failed')stop('Could not prepare the notes. Try again.');};run.rack.onprocessorerror=()=>{if(active===run)stop('Piano playback was interrupted. Try again.');};
  // Schedule only after microphone setup; all musical events use the worklet's sample clock.
  if(!demoOnly){
   run.capture=new AudioWorkletNode(context,'jamloom-singing-capture',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]});run.muted=context.createGain();run.muted.gain.value=0;run.source=context.createMediaStreamSource(run.stream);run.source.connect(run.capture);run.capture.connect(run.muted);run.muted.connect(context.destination);
   run.capture.onprocessorerror=()=>{if(active===run)stop('Audio analysis was interrupted. Try again.');};
   run.capture.port.onmessage=({data})=>{if(active!==run)return;try{
    const at=data.frame/data.rate,centerFrame=Math.round(data.frame-data.samples.length/2),centerAt=centerFrame/data.rate;
    if(at>=listenAt&&!run.listening){run.listening=true;run.stream.getTracks().forEach(t=>t.enabled=true);$('mic-state').textContent='Microphone listening';$('mic-state').classList.add('live');phase('sing');}
    if(at-data.samples.length/data.rate<listenAt)return;
    const pitch=detectPitch(data.samples,data.rate),result=grader.observe(centerFrame,pitch);
    if(lesson.song){run.trace.push({at:centerAt-listenAt,note:isSingingPitch(pitch)?69+12*Math.log2(pitch.frequency/440):null,good:result.cents!==null&&Math.abs(result.cents)<=50});if(run.trace.length>1200)run.trace.splice(0,600);}$('feedback').textContent=result.message;$('hold-progress').value=result.held;$('hold-label').textContent=lesson.hold?result.held.toFixed(1)+` / ${lesson.hold} seconds`:result.held+` / ${phrase.length} notes & rests`;
    $('needle').hidden=result.cents===null;if(result.cents!==null){$('needle').style.left=(50+Math.max(-200,Math.min(200,result.cents))/4)+'%';$('measured').textContent=Math.round(pitch.frequency)+' Hz · '+(result.cents>0?'+':'')+Math.round(result.cents)+' cents';}else $('measured').textContent='Waiting for a clear note';
    if(lesson.hold?result.passed||centerAt>=endAt:result.done)finish(result);
   }finally{if(active===run)run.capture.port.postMessage('ack');}};
  }
  if(context.currentTime>=startAt)throw Error('Audio took longer to prepare. Try again.');
  run.rack.port.postMessage({type:'singing-score',events:lesson.song?songScore(lesson,phrase,root,context.sampleRate,startAt,demoOnly):courseScore(demoPhrase,context.sampleRate,startAt,demoOnly||!!lesson.hold,listenAt,endAt,!demoOnly&&lesson.stage>=3&&$('backing').checked,60/tempo)});
  // Stop pitched accompaniment before capture; optional listening backing is percussion only.
  if(!demoOnly&&!$('backing').checked&&!window.jamloomMobileMuted){run.gain.gain.setValueAtTime(.3,now);run.gain.gain.setValueAtTime(.3,listenAt-.25);run.gain.gain.linearRampToValueAtTime(0,listenAt-.1);}
  $('feedback').textContent=lesson.song?(demoOnly?'Hear the melody with the band':'Get ready · follow the lyrics'):'Listen to the piano';$('mic-state').textContent=demoOnly?'Microphone off':'Microphone ready';phase('hear');
  const draw=()=>{if(active!==run)return;const t=context.currentTime;if(demoOnly&&t>=demoEnd+.4){stop('Your turn when you are ready.');return;}const listening=!demoOnly&&t>=listenAt;const elapsed=t-(listening?listenAt:startAt);const shown=lesson.hold?demoPhrase:phrase;const index=shown.findIndex(n=>elapsed>=n.at&&elapsed<n.at+n.duration);for(const [i,box] of [...$('notes').children].entries())box.classList.toggle('current',i===index);if(lesson.song){drawSingingChart($('live-chart'),phrase,elapsed,run.trace,root);highlightLyric(shown[index]?.lyricIndex??-1);$('lyrics').textContent=shown[index]?.lyric||'♪ Instrumental';$('lyric-next').textContent=shown.slice(Math.max(0,index+1),Math.max(0,index+1)+4).map(n=>n.lyric).filter(Boolean).join(' · ');}
   const note=shown[index]?.note;$('target-note').textContent=index>=0?(note===null?'Rest':noteName(note)):listening&&lesson.hold?noteName(root):'…';if(!lesson.song&&!demoOnly&&t>demoEnd&&t<listenAt){$('feedback').textContent=lesson.hold?'Get ready to hum':`Your turn in ${Math.ceil((listenAt-t)/(60/tempo))}`;phase('sing');}run.raf=requestAnimationFrame(draw);};draw();if(lesson.song)$('live-chart').scrollIntoView({block:'start',behavior:'auto'});
  clearTimeout(run.watchdog);run.watchdog=setTimeout(()=>{if(active===run)stop('Practice timed out. Restart when ready.');},Math.ceil(((demoOnly?demoEnd:endAt)-now+3)*1000));context.addEventListener('statechange',()=>{if(active===run&&context.state!=='running')stop('Audio paused. Restart when ready.');});
 }catch(error){if(!run||active===run)stop(error.name==='NotAllowedError'?'Microphone access was denied. Allow access in your browser, then try again.':error.message||'Could not start the lesson.');}
}
$('find-register').onclick=()=>start(false,true);$('start').onclick=()=>start();$('demo').onclick=()=>start(true);$('stop').onclick=()=>stop();$('register').onchange=renderNotes;$('tempo').onchange=renderNotes;$('section').onchange=()=>{renderNotes();$('result').textContent='';$('review').replaceChildren();$('practice-weakest').hidden=true;};
$('help').onclick=()=>{if(active)stop();$('guide').showModal();};$('close-help').onclick=()=>$('guide').close();document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)stop('Practice paused while this page was hidden.');});window.addEventListener('pagehide',()=>{if(active)stop();});
renderNotes();const progress=showProgress();if(progress[lesson.id]?.passed)$('result').textContent='✓ Previously completed · practice as often as you like';

window.jamloomSingingStop=()=>stop();
