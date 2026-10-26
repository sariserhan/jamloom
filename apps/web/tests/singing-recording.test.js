import test from 'node:test';import assert from 'node:assert/strict';
import {RecordedSingingScore,recordedCapturePosition} from '../singing-recording.js';
const rate=48000,pitch={frequency:220,confidence:1,rms:.2};
const sections=Array.from({length:12},(_,i)=>({at:i*20,notes:Array.from({length:10},(_,j)=>({at:j*2,duration:2,note:j%2?null:57}))}));
function perform(mode){const score=new RecordedSingingScore(sections,rate);for(let i=0;i<24000;i++){const at=i/100;if(mode==='seek'&&at===40)score.interrupt();score.observe(at,i*480,mode==='silence'?null:Math.floor(at/2)%2?null:pitch);}return score;}
test('four-minute score uses bounded phrases and requires actual correct pitch for every section',()=>{
 const good=perform();assert(good.finish().passed);assert.equal(good.results.size,12);assert(good.grader.rows.length<=96);
 assert(!perform('silence').finish().passed);assert(!perform('seek').finish().passed);
});
test('seek, pause and delayed frames cannot bridge scores or earn full-song completion',()=>{
 const s=new RecordedSingingScore(sections,rate);s.observe(0,0,pitch);s.observe(1,rate,pitch);s.observe(100,rate*2,pitch);assert(!s.completeEligible);
 assert.equal(s.observe(101,rate*2,pitch),null);s.reset();assert(s.completeEligible);assert.equal(s.results.size,0);
 for(const bad of [[],Array(65).fill(sections[0]),[{...sections[0],at:-1}],[sections[1],sections[0]],[{...sections[0],at:590}]])assert.throws(()=>new RecordedSingingScore(bad,rate));
});
test('capture aligns to center of microphone window and rejects stale or interrupted input',()=>{
 const media={paused:false,seeking:false,ended:false,readyState:4,playbackRate:1,currentTime:17},context={state:'running',currentTime:20,sampleRate:rate};
 assert(Math.abs(recordedCapturePosition(media,context,20*rate,2048)-(17-1024/rate))<1e-9);
 for(const change of [{paused:true},{seeking:true},{ended:true},{readyState:2},{playbackRate:2}])assert.equal(recordedCapturePosition({...media,...change},context,20*rate,2048),null);
 assert.equal(recordedCapturePosition(media,context,19*rate,2048),null);assert.equal(recordedCapturePosition(media,context,21*rate,2048),null);
});
