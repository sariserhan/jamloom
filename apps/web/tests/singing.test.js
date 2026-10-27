import {test} from 'node:test';import assert from 'node:assert/strict';
import {detectPitch,isSingingPitch} from '../singing-pitch.js';import {SingingHold,frequencyFor} from '../singing-lesson.js';
test('DC offset cannot promote subthreshold periodic noise; audible notes remain measurable',()=>{
 const signal=(amplitude,offset)=>Float32Array.from({length:2048},(_,i)=>offset+amplitude*Math.sin(2*Math.PI*220*i/48000));
 assert.equal(detectPitch(signal(.001,.05),48000),null);
 assert.equal(detectPitch(signal(0,.05),48000),null);
 for(const offset of [0,.05,-.05]){
  const pitch=detectPitch(signal(.006,offset),48000);
  assert(isSingingPitch(pitch));assert(Math.abs(pitch.frequency-220)<1);assert(pitch.rms<.005);
 }
});
const rate=48000;
const tone=(hz,amplitude=.2)=>Float32Array.from({length:4096},(_,i)=>amplitude*Math.sin(2*Math.PI*hz*i/rate));
test('MIT detector measures the three lesson registers and rejects silence/noise/invalid PCM',()=>{
 for(const note of [45,57,69]){const hz=frequencyFor(note),r=detectPitch(tone(hz),rate);assert(r&&r.confidence>.9);assert(Math.abs(1200*Math.log2(r.frequency/hz))<5);}
 assert.equal(detectPitch(new Float32Array(4096),rate),null);
 assert.equal(detectPitch(new Float32Array(4096).fill(.3),rate),null);
 assert.equal(detectPitch(new Float32Array(4096).fill(NaN),rate),null);
 assert.equal(detectPitch(tone(220),NaN),null);assert.equal(detectPitch(new Float32Array(9000),rate),null);
 let seed=123;const noise=Float32Array.from({length:4096},()=>{seed=(seed*1664525+1013904223)>>>0;return (seed/2**32-.5)*.1;});assert.equal(detectPitch(noise,rate),null);
});
test('only sustained measured pitch passes; repeated/stale timestamps and a single good note cannot pass',()=>{
 const grade=new SingingHold(57,rate,rate);const pitch=detectPitch(tone(220),rate);
 for(let i=0;i<300;i++)assert.equal(grade.observe(rate,pitch).passed,false);
 for(let i=1;i<=99;i++)assert.equal(grade.observe(rate+i*960,pitch).passed,false);
 assert.equal(grade.observe(rate+100*960,pitch).passed,true);
});
test('flat/sharp/octave/noise/silence and gaps reset the continuous hold',()=>{
 for(const wrong of [null,detectPitch(tone(110),rate),detectPitch(tone(440),rate),{frequency:220,confidence:.4,rms:.2},{frequency:220,confidence:1,rms:0}]){
  const g=new SingingHold(57,rate,0),pitch=detectPitch(tone(220),rate);
  for(let i=0;i<80;i++)g.observe(i*960,pitch);
  assert.equal(g.observe(80*960,wrong).held,0);assert.equal(g.passed,false);
  assert.equal(g.observe(85*960,pitch).passed,false);
  assert.equal(g.observe(100*960,pitch).held,0);
 }
});
test('practice after completion starts a new independent measurement',()=>{
 const pitch=detectPitch(tone(220),rate),first=new SingingHold(57,rate,0);
 for(let i=0;i<=101;i++)first.observe(i*960,pitch);assert(first.passed);
 const next=new SingingHold(57,rate,0);assert.equal(next.observe(960,pitch).passed,false);
 assert.throws(()=>new SingingHold(300,rate,0));assert.throws(()=>new SingingHold(57,0,0));
});

test('quiet periodic singing qualifies without accepting faint noise or changing octave targets',()=>{
 const quiet=detectPitch(tone(220,.006),rate);assert(isSingingPitch(quiet));
 assert(!isSingingPitch({...quiet,confidence:.94}));assert(!isSingingPitch({...quiet,rms:.0029}));
 const hold=new SingingHold(57,rate,0);for(let i=0;i<=101;i++)hold.observe(i*960,quiet);assert(hold.passed);
 for(const hz of [110,440]){const wrong=new SingingHold(57,rate,0);for(let i=0;i<=101;i++)wrong.observe(i*960,detectPitch(tone(hz,.006),rate));assert(!wrong.passed);}
 let seed=321;for(const level of [.006,.02,.2]){const noise=Float32Array.from({length:2048},()=>{seed=(seed*1664525+1013904223)>>>0;return (seed/2**32-.5)*level;});assert(!isSingingPitch(detectPitch(noise,rate)));}
});

test('changing harmonic singing is measured at the window center across capture rates',()=>{
 for(const sampleRate of [44100,48000,96000])for(const hz of [110,220,440]){
  let phase=0;const samples=Float32Array.from({length:2048},(_,i)=>{
   const at=(i-1024)/sampleRate;
   phase+=2*Math.PI*hz*2**(600*at/1200)/sampleRate;
   return .1*(1+.3*Math.sin(2*Math.PI*i/2048))*(Math.sin(phase)+.5*Math.sin(2*phase)+.25*Math.sin(3*phase));
  });
  const measured=detectPitch(samples,sampleRate);
  assert(isSingingPitch(measured));
  assert(Math.abs(1200*Math.log2(measured.frequency/hz))<20);
 }
});
