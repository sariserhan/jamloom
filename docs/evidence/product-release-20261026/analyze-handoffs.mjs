import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {analyzeTrack} from '../../../apps/site/lib/ai-dj-analysis.ts';
import {measureBeatGrid} from '../../../apps/site/lib/ai-dj-beat-grid.ts';
import {planTransition} from '../../../apps/site/lib/ai-dj-plan.ts';
const root=new URL('../../../',import.meta.url),run=JSON.parse(await readFile(new URL('renders/dj-model-comparison-20261026/report.json',root),'utf8'));
const files=['renders/dj-style-samples-20261025-replacement/house.wav','renders/dj-quality-20261025/house-0.wav',... [5,0].map(i=>'renders/dj-model-comparison-20261026/'+run.tracks[i].file)];
const capture=JSON.parse(await readFile(new URL('mix-checks.json',import.meta.url),'utf8')),tracks=[];
for(const [i,file] of files.entries()){
 const path=new URL(file,root).pathname,bytes=await readFile(path),sha=createHash('sha256').update(bytes).digest('hex');assert.equal(sha,capture.sourceTracks[i]);
 const raw=execFileSync('ffmpeg',['-v','error','-i',path,'-ar','48000','-ac','2','-f','f32le','-'],{maxBuffer:30e6});
 const channels=[0,1].map(c=>{const a=new Float32Array(raw.length/8);for(let n=0;n<a.length;n++)a[n]=raw.readFloatLE(n*8+c*4);return a;});
 const power=a=>a.reduce((sum,v)=>sum+v*v,0),mono=power(channels[1])>power(channels[0])?channels[1]:channels[0],pcm=new Float32Array(Math.floor(mono.length/6));
 for(let n=0;n<pcm.length;n++){let sum=0;for(let j=0;j<6;j++)sum+=mono[n*6+j];pcm[n]=sum/6;}
 const analysis=analyzeTrack(pcm,8000,sha);tracks.push({file,vocal:i===2,analysis,earlyWindows:[4,8,12].map(start=>({start,grid:measureBeatGrid(pcm.subarray(start*8000,(start+24)*8000),8000,analysis.bpm)})),edgeGrids:{start:measureBeatGrid(pcm.subarray(0,24*8000),8000,analysis.bpm),end:measureBeatGrid(pcm.subarray(pcm.length-24*8000),8000,analysis.bpm)}});
}
let now=0,position=tracks[0].analysis.mixBounds.start,rate=1;const transitions=[];
for(let i=0;i<3;i++){
 const a=tracks[i],b=tracks[i+1],plan=planTransition(a.analysis,b.analysis,position,rate,now,false,4,a.vocal||b.vocal);
 transitions.push({from:i+1,to:i+2,...plan});now=plan.at+plan.fade;position=plan.offset+plan.fade*plan.rate;rate=plan.rate;
}
const output=process.argv[2]??'mix-analysis.json';assert.match(output,/^[a-z-]+\.json$/);
await writeFile(new URL(output,import.meta.url),JSON.stringify({scope:'Offline hash-verified analysis; actual captured times remain authoritative',tracks,transitions},null,2)+'\n');
console.log(JSON.stringify({tracks:tracks.map(t=>({file:t.file,bpm:t.analysis.bpm,confidence:t.analysis.confidence,bounds:t.analysis.mixBounds,grid:t.analysis.grid,edges:t.edgeGrids,early:t.earlyWindows})),transitions},null,2));
