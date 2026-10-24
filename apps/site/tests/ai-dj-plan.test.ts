import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeTrack,validAnalysis,validReview,type TrackAnalysis} from '../lib/ai-dj-analysis';
import {planTransition} from '../lib/ai-dj-plan';
const base:TrackAnalysis={version:1,sha256:'a'.repeat(64),duration:128,bpm:120,confidence:.8,beatOffset:0,rms:.1,peak:.6,wave:Array(96).fill(.5),changes:[],keyEstimate:null};
const reviewed={...base,review:{bpm:120,phraseStart:0,mixIn:0,mixOut:112,instrumentalEdges:true}};
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
test('review and cached metadata are hash bound and reject fabricated bounds',()=>{
 assert.ok(validReview(reviewed.review,128));assert.ok(validAnalysis(reviewed,base.sha256));
 assert.equal(validAnalysis(reviewed,'b'.repeat(64)),false);
 for(const review of [{...reviewed.review,mixOut:120},{...reviewed.review,mixIn:-1},{...reviewed.review,bpm:NaN},{...reviewed.review,mixOut:110}])assert.equal(validReview(review,128),false);
 assert.equal(validAnalysis({...base,wave:[NaN]},base.sha256),false);
});
test('analysis measures actual audio and exposes uncertainty without inventing a reviewed grid',()=>{
 const rate=8000,samples=new Float32Array(16*rate);for(let i=0;i<samples.length;i++){const t=i/rate;samples[i]=.2*Math.sin(2*Math.PI*80*t)*Math.exp(-((t+.25)%.5)*30);}
 const a=analyzeTrack(samples,rate,base.sha256);assert.ok(validAnalysis(a,base.sha256));assert.equal(a.bpm,120);assert.ok(Math.abs(a.beatOffset-.25)<.01);assert.equal(a.review,undefined);assert.ok(a.rms>0&&a.peak<=.21);assert.throws(()=>analyzeTrack(new Float32Array(16*rate),rate,base.sha256));
});
