import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStemPlan,scheduleStemPerformance,createStemSequence} from '../stem-performance.js';

const buffers={beat:{duration:7.5,numberOfChannels:2}},event={part:'drums',clip:'beat',at:0,gain:.8};
const plan={seconds:210,bpm:128,events:[event]};
test('stem plans reject missing audio, nonfinite values, overlaps and unbounded schedules',()=>{
 validateStemPlan(plan,buffers);
 for(const changed of [{seconds:Infinity},{seconds:301},{events:[]},{events:Array(257).fill(event)},{bpm:0}])
  assert.throws(()=>validateStemPlan({...plan,...changed},buffers));
 for(const changed of [{at:-1},{at:205},{gain:NaN},{gain:1.1},{part:'unknown'},{clip:'absent'}])
  assert.throws(()=>validateStemPlan({...plan,events:[{...event,...changed}]},buffers));
 assert.throws(()=>validateStemPlan({...plan,events:[event,{...event,at:7}]},buffers),/Overlapping/);
 validateStemPlan({...plan,events:[event,{...event,at:7.5}]},buffers);
});
test('delivered stem blocks share exact boundaries, bound buffers and reject missing rhythm or late audio',()=>{
 const sources=[],parameter=()=>({value:1,setValueAtTime(){},linearRampToValueAtTime(){},cancelScheduledValues(){}});
 const ctx={sampleRate:48000,currentTime:1,createGain:()=>({gain:parameter(),connect(){},disconnect(){}}),
  createBufferSource(){const s={connect(){},disconnect(){},start(t){this.at=t;},stop(t){this.until=t;}};sources.push(s);return s;}};
 const mixer={strips:[{input:{}},{input:{}}],rackFX:{input:{}},performanceFX:{input:{}}};
 const block={seconds:7.5,bpm:128,contextId:'a'.repeat(64),sequence:0,events:[event,{...event,part:'bass'}]};
 const stream=createStemSequence(ctx,mixer,96000);
 assert.throws(()=>stream.enqueue({...block,events:[event]},buffers),/coverage/);
 stream.enqueue(block,buffers);
 assert.throws(()=>stream.enqueue(block,buffers),/ordered/);
 assert.throws(()=>stream.enqueue({...block,sequence:1,bpm:130},buffers),/compatible/);
 stream.enqueue({...block,sequence:1},buffers);
 assert.throws(()=>stream.enqueue({...block,sequence:2},buffers),/buffer full/);
 assert.deepEqual(sources.map(s=>s.at),[2,2,9.5,9.5]);
 ctx.currentTime=10;
 stream.enqueue({...block,sequence:2},buffers);
 assert.deepEqual(sources.slice(-2).map(s=>s.at),[17,17]);
 assert.equal(stream.snapshot().buffered,2);assert.equal(stream.snapshot().active.length,2);
 ctx.currentTime=25;
 assert.equal(stream.snapshot().buffered,0);
 assert.throws(()=>stream.enqueue({...block,sequence:3},buffers),/passed/);
 stream.stop();assert.throws(()=>stream.enqueue({...block,sequence:3},buffers),/stopped/);
});
test('one context schedules exact source starts; stop cancels current and future voices',()=>{
 const sources=[],parameter=()=>({value:1,setValueAtTime(){},linearRampToValueAtTime(){},cancelScheduledValues(){}});
 const ctx={sampleRate:48000,currentTime:1,createGain:()=>({gain:parameter(),connect(){},disconnect(){}}),
  createBufferSource(){const s={connect(){},disconnect(){},start(t){this.at=t;},stop(t){this.until=t;}};sources.push(s);return s;}};
 const mixer={strips:[{input:{}},{input:{}}],rackFX:{input:{}},performanceFX:{input:{}}};
 const p={...plan,events:[event,{...event,part:'bass',at:7.5}]};
 assert.throws(()=>scheduleStemPerformance(ctx,mixer,p,buffers,0),/passed/);
 const performance=scheduleStemPerformance(ctx,mixer,p,buffers,96000);
 assert.deepEqual(sources.map(s=>s.at),[2,9.5]);assert.equal(performance.snapshot().active.length,0);
 ctx.currentTime=2.5;assert.equal(performance.snapshot().active.length,1);
 ctx.currentTime=10;assert.equal(performance.snapshot().active[0].part,'bass');
 performance.stop();performance.stop();assert(sources.every(s=>s.until===10.005));
 assert.equal(performance.snapshot().active.length,0);assert(performance.snapshot().ended);
});
