import test from 'node:test';import assert from 'node:assert/strict';
import {timingProbe,findProbe,timingResult} from '../../../scripts/fixtures/audio-timing.js';
test('probe correlation measures delayed attenuated and inverted audio across capture rates',()=>{
 for(const rate of [44100,48000,96000])for(const gain of [.1,-.2]){
  const size=2**Math.ceil(Math.log2(rate*.04)),pcm=new Float32Array(size),probe=timingProbe(rate),at=Math.round(rate*.01);for(let i=0;i<probe.length;i++)pcm[at+i]=gain*probe[i];
  const hit=findProbe(pcm,rate);assert(hit);assert(Math.abs(hit.offset-at)<=Math.floor(rate/12000));
 }
});
test('silence, noise, arbitrary tones and unstable or incomplete timings cannot pass',()=>{
 let seed=87;for(const rate of [44100,48000]){const n=2**Math.ceil(Math.log2(rate*.04));
  for(const samples of [new Float32Array(n),Float32Array.from({length:n},()=>{seed=(1664525*seed+1013904223)>>>0;return (seed/2**32-.5)*.1;}),Float32Array.from({length:n},(_,i)=>.1*Math.sin(i/rate*2*Math.PI*220))])assert.equal(findProbe(samples,rate),null);
 }
 for(const values of [[],[.1,.1,.1],[.1,.1,.1,.3],[NaN,.1,.1,.1],[-.1,.1,.1,.1]])assert.equal(timingResult(values),null);
 assert.deepEqual(timingResult([.1,.101,.099,.1,.1]),{roundTripMs:100,spreadMs:2.0000000000000018,detectedProbes:5});
 assert.equal(timingResult([.1,.102,.104,.106]).roundTripMs,103);
});
