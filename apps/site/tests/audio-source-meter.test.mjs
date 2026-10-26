import assert from 'node:assert/strict';
import test from 'node:test';
import {countAudioSources} from './silent-audio.mjs';

test('source accounting ignores failed starts and duplicate ends without hiding other live nodes',()=>{
 const prior=globalThis.AudioContext,priorCounts=globalThis.betaSources;
 class Source extends EventTarget {
  start(){if(this.started)throw Error('already started');this.started=true;}
 }
 globalThis.AudioContext=class {createBufferSource(){return new Source();}};
 try{
  countAudioSources();const ctx=new AudioContext(),a=ctx.createBufferSource(),b=ctx.createBufferSource();
  a.start();b.start();assert.throws(()=>a.start(),/already/);
  let observed=0;a.addEventListener('ended',()=>observed++);
  a.dispatchEvent(new Event('ended'));a.dispatchEvent(new Event('ended'));
  assert.deepEqual(betaSources,{started:2,ended:1,active:1,duplicateEnds:1,unstartedEnds:0});
  assert.equal(observed,2);b.dispatchEvent(new Event('ended'));assert.equal(betaSources.active,0);
  ctx.createBufferSource().dispatchEvent(new Event('ended'));assert.equal(betaSources.unstartedEnds,1);
 }finally{globalThis.AudioContext=prior;globalThis.betaSources=priorCounts;}
});
