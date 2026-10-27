// Development comparison on already inspected recordings; never an independent holdout.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,basename} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
const sha=b=>createHash('sha256').update(b).digest('hex');
const old=execFileSync('git',['show','67c7cb1:apps/web/singing-pitch.js']);
assert.equal(sha(old),'06853d19354302baa2984c6a09a7261bbc1e5bd692cfb0ee8bc498b11cc2fccd');
const candidatePath=resolve(process.argv[2]),output=resolve(process.argv[3]);
const modules=[await import('data:text/javascript;base64,'+old.toString('base64')),await import(pathToFileURL(candidatePath).href)];
const gate=modules[0].isSingingPitch;
// Fixed thresholds: the comparison changes difference-window geometry only.
assert.equal(modules[1].isSingingPitch.toString(),gate.toString());
for(const module of modules){
 for(const rate of [44100,48000])for(const hz of [110,220,440,880]){
  const tone=Float32Array.from({length:2048},(_,i)=>.2*Math.sin(2*Math.PI*hz*i/rate));
  const pitch=module.detectPitch(tone,rate);assert(gate(pitch));assert(Math.abs(1200*Math.log2(pitch.frequency/hz))<5);
 }
 let seed=37;for(const level of [.001,.006,.1,.5])for(let frame=0;frame<20;frame++){
  const noise=Float32Array.from({length:2048},()=>{seed=(1664525*seed+1013904223)>>>0;return (seed/2**32-.5)*level;});
  assert(!gate(module.detectPitch(noise,48000)));
 }
}
const manifestPath=process.argv[4],base=process.argv[5]??'build-singing-holdout-20261027';
const prior=JSON.parse(readFileSync('docs/evidence/singing-holdout-20261027/timeline-validated-results.json'));
const receipt=JSON.parse(readFileSync(base+'/receipt.json'));
const manifest=manifestPath?JSON.parse(readFileSync(manifestPath)):null;
if(manifest){assert.equal(sha(readFileSync(manifestPath)),receipt.manifestSha256);assert.equal(sha(readFileSync(candidatePath)),manifest.candidateSha256);}
const tracks=manifest?manifest.tracks.map(r=>({...r,audio:basename(r.audio.name)})):prior.results;
const results=[],quarantined=[];
for(const track of tracks){
 const audio=base+'/'+track.audio,annotation=audio.replace(/\.wav$/,'.csv');
 for(const file of [audio,annotation])assert.equal(sha(readFileSync(file)),receipt.files.find(r=>r.name===basename(file)).sha256);
 const labels=readFileSync(annotation,'utf8').trim().split(/\r?\n/).slice(1).map(l=>l.split(',').slice(0,2).map(Number));
 const bytes=execFileSync('ffmpeg',['-v','error','-i',audio,'-ac','1','-ar','48000','-f','f32le','pipe:1'],{maxBuffer:32000000});
 const pcm=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 if(labels[0][0]>.05||Math.abs(labels.at(-1)[0]-pcm.length/48000)>.05){quarantined.push({audio:track.audio,seconds:pcm.length/48000,annotationStart:labels[0][0],annotationEnd:labels.at(-1)[0],reason:'Timeline coverage mismatch; no retiming'});continue;}
 const counts=modules.map(()=>({frames:0,reference:0,predicted:0,correct:0,falseVoiced:0,cpuMs:0}));let cursor=0;
 for(let at=0;at+2048<=pcm.length;at+=480){
  const time=(at+1024)/48000;while(cursor+1<labels.length&&Math.abs(labels[cursor+1][0]-time)<Math.abs(labels[cursor][0]-time))cursor++;
  if(Math.abs(labels[cursor][0]-time)>.01)continue;const truth=labels[cursor][1];
  modules.forEach((module,i)=>{const c=counts[i],start=performance.now(),p=module.detectPitch(pcm.subarray(at,at+2048),48000);c.cpuMs+=performance.now()-start;c.frames++;if(truth)c.reference++;if(gate(p)){c.predicted++;if(!truth)c.falseVoiced++;else if(Math.abs(1200*Math.log2(p.frequency/truth))<=50)c.correct++;}});
 }
 results.push({audio:track.audio,singer:track.singer,condition:track.condition,counts});console.log(track.audio,counts.map(c=>c.correct/c.reference));
}
const totals=modules.map((_,i)=>Object.fromEntries(Object.keys(results[0].counts[i]).map(k=>[k,results.reduce((s,r)=>s+r.counts[i][k],0)])));
const report={scope:manifest?'New recordings selected and candidate frozen before measurement; publisher singers overlap development set':'Previously inspected development data; no threshold tuning, model training or shipping change implied',manifestSha256:manifest?sha(readFileSync(manifestPath)):null,baselineSha256:sha(old),candidateSha256:sha(readFileSync(candidatePath)),checks:'Tones at 44.1/48k and 80 noise frames PASS',totals,results,quarantined,limitations:['Timeline-invalid files are quarantined before scoring','CPU measured locally, not physical latency','No new-singer or real microphone acceptance']};
writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(totals);
