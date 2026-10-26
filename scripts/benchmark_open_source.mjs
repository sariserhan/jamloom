import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),cache=process.argv[2]??'/tmp/jamloom-oss-audit-20261026';
const load=path=>import(pathToFileURL(path));
const {detectPitch:shippedPitch}=await load(root+'/apps/web/singing-pitch.js');
const {detectPitch}=await load(cache+'/akhilvydyula__predict-voice-quality/source/src/audio/yinPitch.ts');
const {detectTempo}=await load(cache+'/koneb71__djkado/source/src/audio/dsp/bpm.ts');
const {computeWaveform}=await load(cache+'/koneb71__djkado/source/src/audio/dsp/waveform.ts');
const {analyzeTrack}=await load(root+'/apps/site/lib/ai-dj-analysis.ts');
const {DeckDSP}=await load(root+'/apps/web/deck-dsp.js');
const fixtures=JSON.parse(readFileSync(root+'/build-open-source-audit/fixtures.json','utf8'));
const median=a=>a.length?[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)]:null;
const results=[];
for(const row of fixtures){
 const bytes=readFileSync(root+'/'+row.file),a=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 if(['real_cc0_note','synthetic_control','unvoiced_control'].includes(row.kind)){
  const times=[],pitches=[];for(let start=0;start+2048<=a.length;start+=320){const began=performance.now(),pitch=detectPitch(a.subarray(start,start+2048),row.rate);times.push(performance.now()-began);pitches.push(pitch&&pitch.confidence>=.9?pitch.frequency:0);}
  const shippedTimes=[];for(let start=0,index=0;start+2048<=a.length;start+=320,index++){const began=performance.now(),pitch=shippedPitch(a.subarray(start,start+2048),row.rate);shippedTimes.push(performance.now()-began);assert.equal(pitch&&pitch.confidence>=.9?pitch.frequency:0,pitches[index],'Adapted detector must preserve reviewed audio results');}
  const baseline=JSON.parse(execFileSync('/tmp/jamloom-pitch-core-audit',[root+'/'+row.file,String(row.rate)],{encoding:'utf8'}));
  const score=p=>({voiced:p.filter(x=>x>0).length,frames:p.length,medianCents:row.expected_hz?median(p.filter(x=>x>0).map(hz=>Math.abs(1200*Math.log2(hz/row.expected_hz)))):null,within50Cents:row.expected_hz?p.filter(hz=>hz>0&&Math.abs(1200*Math.log2(hz/row.expected_hz))<=50).length/p.length:null});
  results.push({name:row.name,kind:row.kind,yin:{...score(pitches),medianFrameMs:median(times),p95FrameMs:[...times].sort((a,b)=>a-b)[Math.floor(times.length*.95)]},shippedYin:{identicalFrequencies:true,medianFrameMs:median(shippedTimes),p95FrameMs:[...shippedTimes].sort((a,b)=>a-b)[Math.floor(shippedTimes.length*.95)]},jamloomCore:{...score(baseline.frequencies),totalMs:baseline.seconds*1000}});
 }else if(['real_generated_music','synthetic_beat_control'].includes(row.kind)){
  let start=performance.now();const ours=analyzeTrack(a,row.rate,'a'.repeat(64));const oursMs=performance.now()-start;
  start=performance.now();const theirs=detectTempo(a,row.rate);const theirsMs=performance.now()-start;
  start=performance.now();const wave=computeWaveform(a,row.rate);const waveformMs=performance.now()-start;
  assert(Number.isFinite(theirs.bpm)&&wave.peak.length>0);
  results.push({name:row.name,kind:row.kind,expectedBpm:row.expected_bpm??null,jamloom:{bpm:ours.bpm,confidence:ours.confidence,ms:oursMs,waveBins:ours.wave.length},djkado:{bpm:theirs.bpm,confidence:theirs.confidence,ms:theirsMs,waveformMs,waveBins:wave.length,waveBytes:wave.peak.byteLength*4}});
 }
}
const row=fixtures.find(r=>r.name==='original-0'),bytes=readFileSync(root+'/'+row.file),a=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+8*row.rate*4));
const dsp=new DeckDSP([a],row.rate);dsp.keylock=true;dsp.speed=1.08;dsp.playing=true;
const output=new Float32Array(Math.ceil(a.length/1.08));let start=performance.now();for(let at=0;at<output.length;at+=128)dsp.process([output.subarray(at,Math.min(at+128,output.length))]);
const stretch={ms:performance.now()-start,seconds:output.length/row.rate,rate:row.rate,speed:1.08,peak:output.reduce((m,v)=>Math.max(m,Math.abs(v)),0),scope:'Same 8 kHz fixture as offline librosa; no perceptual quality ranking'};
assert(output.every(Number.isFinite)&&stretch.peak>0);writeFileSync(root+'/build-open-source-audit/jamloom-stretch.f32',Buffer.from(output.buffer));
const report={status:'PASS measurement; musical acceptance NOT RUN',node:process.version,fixtures,results,stretch};writeFileSync(root+'/docs/evidence/open-source-audit-20261026/audio-benchmark.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({results,stretch},null,2));
