import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeTrack,validAnalysis,validReview,type TrackAnalysis} from '../lib/ai-dj-analysis';
import {planTransition} from '../lib/ai-dj-plan';
import {measureBeatGrid,validBeatGrid} from '../lib/ai-dj-beat-grid';
const base:TrackAnalysis={version:1,sha256:'a'.repeat(64),duration:128,bpm:120,confidence:.8,beatOffset:0,rms:.1,peak:.6,wave:Array(96).fill(.5),changes:[],keyEstimate:null};
const reviewed={...base,review:{bpm:120,phraseStart:0,mixIn:0,mixOut:112,instrumentalEdges:true}};
test('measured steady beats enable only short aligned handoffs and reject drift',()=>{
 const samples=new Float32Array(48*8000);
 for(let i=0;i<samples.length;i++){const t=i/8000;samples[i]=.2*Math.sin(2*Math.PI*80*t)*Math.exp(-((t+.25)%.5)*40);}
 const grid=measureBeatGrid(samples,8000,120);assert.ok(grid);assert.ok(Math.abs(grid.bpm-120)<.06);assert.ok(Math.abs(grid.offset-.25)<.02);
 const measured={...base,duration:48,grid};const p=planTransition(measured,measured,4,1,10);assert.equal(p.technique,'beat-bass');assert.ok(Math.abs((p.at-10+4-grid.offset)/(.5)-Math.round((p.at-10+4-grid.offset)/.5))<.01);assert.equal(p.offset,grid.entry);assert.ok(Math.abs(p.fade-2)<.01);
 assert.equal(planTransition(measured,{...measured,grid:{...grid,bpm:130}},4,1,10).technique,'short-fade');
 assert.equal(planTransition(measured,measured,47.9,1,10).technique,'short-fade');
 for(let i=0;i<samples.length;i++){const t=i/8000,phase=t*2+t*t*.005;samples[i]=.2*Math.sin(2*Math.PI*80*t)*Math.exp(-(phase%1)*20);}
 assert.equal(measureBeatGrid(samples,8000,124),undefined);
 assert.equal(measureBeatGrid(new Float32Array(48*8000),8000,120),undefined);
});
test('phrase matching requires reviewed instrumental regions and bounds tempo changes',()=>{
 const p=planTransition(reviewed,reviewed,4,1,10);assert.deepEqual({at:p.at,fade:p.fade,offset:p.offset,rate:p.rate,technique:p.technique},{at:118,fade:16,offset:0,rate:1,technique:'phrase-bass'});
 const atTempo=(bpm:number)=>({...reviewed,review:{...reviewed.review,bpm,mixOut:7*1920/bpm},duration:8*1920/bpm});
 const matched=planTransition(reviewed,atTempo(125),4,1,10);assert.equal(matched.technique,'phrase-bass');assert.equal(matched.rate,.96);assert.equal(matched.fade,16);
 assert.equal(planTransition(reviewed,atTempo(130),4,1,10).technique,'short-fade');
 const following=planTransition(atTempo(125),reviewed,4,.96,10);assert.equal(following.technique,'phrase-bass');assert.equal(following.rate,1);assert.equal(following.fade,16);
 for(const a of [base,{...reviewed,review:{...reviewed.review,instrumentalEdges:false}},{...reviewed,review:{...reviewed.review,bpm:90}}])assert.equal(planTransition(reviewed,a,4,1,10).technique,'short-fade');
 assert.equal(planTransition(reviewed,reviewed,4,1,10,true).technique,'short-fade');
});
test('fallback ends before exhaustion, changes no tempo, and handles late preparation',()=>{
 for(const position of [0,100,127,127.9,127.99,127.999]){const p=planTransition(base,base,position,1,10);assert.equal(p.rate,1);assert.ok(p.at>=10);assert.ok(p.at+p.fade<=10+128-position+1e-9);const early=planTransition(base,base,position,1,10,true);assert.ok(early.at+early.fade<=10+128-position+1e-9);assert.equal(p.technique,'short-fade');}
 assert.throws(()=>planTransition(base,base,NaN,1,10));assert.throws(()=>planTransition(base,base,128,1,10));
});
test('a conservative handoff skips an unsupported opening only with a validated early steady entry',()=>{
 const grid={bpm:120,offset:.25,maxError:.01,coverage:.95,entry:12.25,exit:47.25,hookSafe:true};
 const incoming={...base,duration:60,grid};
 const plan=planTransition(base,incoming,120,1,10);assert.equal(plan.technique,'short-fade');assert.equal(plan.offset,12.25);assert.equal(plan.rate,1);
 for(const change of [{entry:25},{coverage:.1},{maxError:.1}])assert.equal(planTransition(base,{...incoming,grid:{...grid,...change}},120,1,10).offset,0);
});
test('review and cached metadata are hash bound and reject fabricated bounds',()=>{
 assert.ok(validReview(reviewed.review,128));assert.ok(validAnalysis(reviewed,base.sha256));
 assert.equal(validAnalysis(reviewed,'b'.repeat(64)),false);
 for(const review of [{...reviewed.review,mixOut:120},{...reviewed.review,mixIn:-1},{...reviewed.review,bpm:NaN},{...reviewed.review,mixOut:110}])assert.equal(validReview(review,128),false);
 assert.equal(validAnalysis({...base,wave:[NaN]},base.sha256),false);
});
test('upgrading numerical analysis preserves existing human mix-point reviews',async()=>{
 const {analyseBuffer}=await import('../lib/ai-dj-library'),{analysisKey}=await import('../lib/ai-dj-analysis');
 const descriptors=['localStorage','Worker'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)] as const);
 const storage=new Map([[analysisKey,JSON.stringify([reviewed])]]);let analyses=0;
 try{
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>storage.get(key),setItem:(key:string,value:string)=>storage.set(key,value)}});
  Object.defineProperty(globalThis,'Worker',{configurable:true,value:class{
   onmessage:(message:unknown)=>void=()=>{};terminate(){}
   postMessage(){analyses++;queueMicrotask(()=>this.onmessage({data:{analysis:{...base,gridVersion:2,mixVersion:1,mixBounds:{start:0,end:128},audible:{start:0,end:128}}}}));}
  }});
  const pcm=new Float32Array(128*8000).fill(.1),buffer={duration:128,numberOfChannels:1,length:pcm.length,sampleRate:8000,getChannelData:()=>pcm} as unknown as AudioBuffer;
  assert.deepEqual((await analyseBuffer(buffer,base.sha256)).review,reviewed.review);
  assert.deepEqual((await analyseBuffer(buffer,base.sha256)).review,reviewed.review);assert.equal(analyses,1);
 }finally{for(const [key,descriptor] of descriptors)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}
});
test('analysis measures actual audio and exposes uncertainty without inventing a reviewed grid',()=>{
 const rate=8000,samples=new Float32Array(16*rate);for(let i=0;i<samples.length;i++){const t=i/rate;samples[i]=.2*Math.sin(2*Math.PI*80*t)*Math.exp(-((t+.25)%.5)*30);}
 const a=analyzeTrack(samples,rate,base.sha256);assert.ok(validAnalysis(a,base.sha256));assert.equal(a.bpm,120);assert.ok(Math.abs(a.beatOffset-.25)<.01);assert.equal(a.review,undefined);assert.ok(a.rms>0&&a.peak<=.21);assert.throws(()=>analyzeTrack(new Float32Array(16*rate),rate,base.sha256));
});

test('vocal loop requires matching measured beat timing and a brief approved cue',async()=>{
 const {validVocalCue,vocalLoopReady}=await import('../lib/dj-vocal');
 const cue={start:30.25,seconds:2,bpm:120,repeat:true},grid={bpm:120,offset:.25,maxError:.01,coverage:.95,entry:.25,exit:47.25,hookSafe:true};
 assert.ok(validVocalCue(cue));assert.ok(vocalLoopReady(cue,grid,30.15));
 for(const position of [29,30.26,NaN])assert.equal(vocalLoopReady(cue,grid,position),false);
 assert.equal(vocalLoopReady(cue,undefined,30.15),false);assert.equal(vocalLoopReady({...cue,start:30.1},grid,30),false);
 assert.equal(validVocalCue({...cue,seconds:5}),false);assert.equal(vocalLoopReady({...cue,repeat:false},grid,30.15),false);
});


test('section grids tolerate breakdowns but reject noise, drift and unsafe mix edges',()=>{
 const rate=8000,samples=new Float32Array(60*rate);
 for(let i=0;i<samples.length;i++){const t=i/rate;if(t>4&&t<24||t>36&&t<57)samples[i]=.2*Math.sin(2*Math.PI*80*t)*Math.exp(-((t+.25)%.5)*40);}
 const grid=measureBeatGrid(samples,rate,84);assert.ok(grid);assert.ok(Math.abs(grid.bpm-120)<.06);assert.ok(grid.regions!.length>=2);assert.ok(grid.coverage<.8);assert.equal(grid.hookSafe,false);
 for(const regions of [null,{},[null],[{start:0,end:100,beats:32}]])assert.equal(validBeatGrid({...grid,regions:regions as any}),false);
 const measured={...base,duration:60,grid};assert.equal(planTransition(measured,measured,5,1,10).technique,'beat-bass');
 assert.equal(planTransition({...measured,duration:128},measured,5,1,10).technique,'short-fade');
 let seed=17;for(let i=0;i<samples.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;samples[i]=(seed/2**32-.5)*.3;}
 assert.equal(measureBeatGrid(samples,rate,128),undefined);
});

test('silent outer padding is skipped without removing internal musical rests or trusting invalid cached edges',()=>{
 const samples=new Float32Array(60*8000);for(let i=2*8000;i<53*8000;i++)if(i<25*8000||i>28*8000)samples[i]=.2*Math.sin(2*Math.PI*100*i/8000);
 for(let i=53*8000;i<samples.length;i++)samples[i]=.0007+.001*Math.sin(i);
 const a=analyzeTrack(samples,8000,base.sha256);assert.ok(a.audible);assert.ok(Math.abs(a.audible.start-1.95)<.01);assert.ok(Math.abs(a.audible.end-53.05)<.01);assert.equal(a.duration,60);
 const p=planTransition(a,a,5,1,10);assert.equal(p.technique,'short-fade');assert.equal(p.offset,a.audible.start);assert.ok(p.at+p.fade<=10+a.audible.end-5);
 assert.equal(validAnalysis({...a,audible:{start:0,end:61}},base.sha256),false);assert.equal(validAnalysis({...a,audible:{start:17,end:53}},base.sha256),false);
 const late=planTransition(a,a,59.99,1,10);assert.ok(late.at+late.fade<=10.011);
 const invalid=planTransition({...base,audible:{start:0,end:NaN}},base,5,1,10);assert.ok(Number.isFinite(invalid.at));
});

test('sustained energy mix edges avoid weak fade tails while retaining internal breaks',()=>{
 const pcm=new Float32Array(60*8000);for(let i=0;i<pcm.length;i++){const t=i/8000;pcm[i]=.2*Math.sin(2*Math.PI*110*t)*(t<5?t/5:t>50?(60-t)/10:1);}
 const a=analyzeTrack(pcm,8000,base.sha256);assert.ok(a.mixBounds!.start>a.audible!.start);assert.ok(a.mixBounds!.end<a.audible!.end-1);
 const plan=planTransition(a,a,10,1,20);assert.equal(plan.fade,4);assert.equal(plan.offset,a.mixBounds!.start);assert.ok(plan.at+plan.fade<=20+a.mixBounds!.end-10);
 assert.equal(validAnalysis({...a,mixBounds:{start:NaN,end:55}},base.sha256),false);
});
test('automatic moves use steady measured beats, leave transition space and hold on uncertain audio',async()=>{
 const {performanceMove}=await import('../lib/ai-dj-moves');
 const a={...base,duration:60,grid:{bpm:120,offset:0,maxError:.01,coverage:.9,entry:0,exit:59,hookSafe:true}};
 for(const ordinal of [-1,.5,NaN,Infinity])assert.equal(performanceMove(a,10,1,20,50,-1000,ordinal,false),null);
 for(const [ordinal,action] of ['filter','roll-one','echo'].entries()){const p=performanceMove(a,10.1,1,20,50,-1000,ordinal,false);assert.ok(p);assert.equal(p.action,action);assert.ok(Math.abs(p.position/.5-Math.round(p.position/.5))<.001);assert.ok(p.at>20);}
 assert.equal(performanceMove(a,10,1,20,25,-1000,0,false),null);assert.equal(performanceMove(a,10,1,20,50,8,0,false),null);assert.equal(performanceMove(a,10,1,20,50,-1000,0,true),null);assert.equal(performanceMove(base,10,1,20,50,-1000,0,false),null);assert.equal(performanceMove({...a,changes:[11]},10,1,20,50,-1000,0,false),null);
});
