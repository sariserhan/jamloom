import test from 'node:test';import assert from 'node:assert/strict';
import {singingSongs,singingLessons,phraseFor,readProgress,saveAttempt,progressKey} from '../singing-course.js';
import {SingingHold,SingingPhrase,frequencyFor} from '../singing-lesson.js';
import {SingingScore,courseScore,songScore} from '../singing-score.js';
import {detectPitch} from '../singing-pitch.js';
const rate=48000;
const pitch=note=>detectPitch(Float32Array.from({length:2048},(_,i)=>.2*Math.sin(2*Math.PI*frequencyFor(note)*i/rate)),rate);
const cache=new Map();const measured=note=>{if(note===null)return null;if(!cache.has(note))cache.set(note,pitch(note));return cache.get(note);};
function perform(lesson,mode='correct',root=57,tempo=80){const phrase=phraseFor(lesson,root,tempo),g=lesson.hold?new SingingHold(root,rate,0,lesson.hold):new SingingPhrase(phrase,rate,0);let result;const duration=lesson.hold?lesson.hold+.4:phrase.at(-1).at+phrase.at(-1).duration+.1;for(let frame=0;frame<=Math.ceil(duration*rate);frame+=960){const at=frame/rate,n=phrase.find(n=>at>=n.at&&at<n.at+n.duration),note=mode==='silence'?null:mode==='constant'?root:lesson.hold?root:n?.note??null;result=g.observe(frame,measured(note));}return result;}
test('all twelve exercises pass measured correct tones at every supported pace and register; silence never passes',()=>{
 assert.equal(new Set(singingLessons.map(l=>l.id)).size,12);
 for(const l of singingLessons){for(const root of [45,57,69])for(const tempo of [60,80,100])assert.equal(perform(l,'correct',root,tempo).passed,true,l.id);assert.equal(perform(l,'silence').passed,false,l.id);if(!l.hold)assert.equal(perform(l,'constant').passed,false,l.id);}
});
test('late notes, missing notes, repeated frames and dropped capture cannot earn completion',()=>{
 const phrase=phraseFor(singingLessons[3]);for(const mode of ['late','missing','duplicates','gap']){const g=new SingingPhrase(phrase,rate,0);for(let f=0;f<=rate*5;f+=960){const t=f/rate,n=phrase.find(n=>t>=n.at&&t<n.at+n.duration);let p=n?measured(n.note):null;if(mode==='late'&&n&&t-n.at<.5)p=null;if(mode==='missing'&&n?.note===59)p=null;if(mode==='duplicates'){g.observe(0,p);continue;}if(mode==='gap'&&f%9600!==0)continue;g.observe(f,p);}assert.equal(g.result().passed,false,mode);}
 assert.throws(()=>new SingingPhrase([{note:57,at:-1,duration:1}],rate,0));assert.throws(()=>new SingingPhrase([{note:100,at:0,duration:1}],rate,0));
});
test('progress preserves best/pass across retries, migrates first-note completion, ignores malformed storage',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};data.set('jamloom.singing.first-note.v1','passed');assert(readProgress(storage)['first-note'].passed);
 saveAttempt(storage,'step-up',{score:90,passed:true});saveAttempt(storage,'step-up',{score:20,passed:false});assert.deepEqual(readProgress(storage)['step-up'],{best:90,attempts:2,passed:true});
 data.set(progressKey,'{"step-up":{"best":999,"attempts":1,"passed":true}}');assert.equal(readProgress(storage)['step-up'],undefined);data.set(progressKey,'not json');assert.deepEqual(readProgress(storage),{});assert.throws(()=>saveAttempt(storage,'unknown',{score:100,passed:true}));assert.throws(()=>saveAttempt(storage,'step-up',{score:NaN,passed:true}));
});
test('finite note score is sample accurate across callback sizes and ends every note',()=>{
 const events=courseScore(phraseFor(singingLessons[11]),rate,1,false,15,25,true,.75);
 const render=block=>{const s=new SingingScore(rate,0,events),out=[];let at=0;while(at<rate*27)s.run(Math.min(block,rate*27-at),n=>at+=n,c=>out.push({frame:at,command:c}));return out;};assert.deepEqual(render(128),events);assert.deepEqual(render(511),events);
 assert.throws(()=>new SingingScore(rate,0,events.slice(0,-1)));assert.throws(()=>new SingingScore(rate,0,[{frame:-1,command:{type:'panic'}}]));assert.throws(()=>new SingingScore(rate,0,[...events].reverse()));
 for(const tempo of [60,80,100]){const p=phraseFor(singingLessons[11],57,tempo),e=courseScore(p,rate,1,false,20,35,true,60/tempo);assert(e.every(e=>e.command.patch!==0||e.frame<20*rate));}
});

test('original songs grade measured notes at every register and pace, reject silence and validate full band scores',()=>{
 for(const song of singingSongs){assert.equal(song.notes.length,song.lyrics.length);assert.deepEqual(song.lines.flatMap(line=>line.split(' ')),song.lyrics.slice(1,-1));for(const root of [45,57,69])for(const tempo of [song.tempo-16,song.tempo,Math.min(128,song.tempo+16)]){assert.equal(perform(song,'correct',root,tempo).passed,true,song.id);const phrase=phraseFor(song,root,tempo);for(const guide of [false,true]){const events=songScore(song,phrase,root,rate,1,guide);assert.doesNotThrow(()=>new SingingScore(rate,0,events));assert.equal(events.some(e=>e.command.patch===0),guide);}}assert.equal(perform(song,'silence').passed,false);assert.equal(perform(song,'constant').passed,false);}
});
test('song score follows real audio clock after an unconnected worklet priming callback',()=>{
 const events=[{frame:40000,command:{type:'note',id:1,patch:0,pitch:57,velocity:72}},{frame:42000,command:{type:'off',id:1}}],score=new SingingScore(rate,0,events),out=[];
 score.run(128,()=>{},()=>assert.fail('early event'),0);
 for(let frame=32000;frame<43000;frame+=128){let cursor=frame;score.run(128,n=>cursor+=n,command=>out.push({frame:cursor,command}),frame);}
 assert.deepEqual(out,events);
});
