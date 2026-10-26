import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {analyzeTrack} from '../../../apps/site/lib/ai-dj-analysis.ts';import {planTransition} from '../../../apps/site/lib/ai-dj-plan.ts';
const root=new URL('../../../',import.meta.url),source='renders/dj-flow-qualification-20261026/',run=JSON.parse(await readFile(new URL(source+'report.json',root),'utf8')),tracks=[];
assert.equal(run.cleanup_confirmed,true);assert.equal(run.tracks.length,12);
for(const row of run.tracks){
 if(!row.receipt.model_comparison.parameters.instrumental)continue;
 const file=source+row.file,bytes=await readFile(new URL(file,root));assert.equal(createHash('sha256').update(bytes).digest('hex'),row.receipt.sha256);
 const raw=execFileSync('ffmpeg',['-v','error','-i',new URL(file,root).pathname,'-ar','48000','-ac','2','-f','f32le','-'],{maxBuffer:30e6});
 const channels=[0,1].map(c=>{const a=new Float32Array(raw.length/8);for(let n=0;n<a.length;n++)a[n]=raw.readFloatLE(n*8+c*4);return a;});
 const power=a=>a.reduce((sum,v)=>sum+v*v,0),mono=power(channels[1])>power(channels[0])?channels[1]:channels[0],pcm=new Float32Array(Math.floor(mono.length/6));
 for(let n=0;n<pcm.length;n++){let sum=0;for(let j=0;j<6;j++)sum+=mono[n*6+j];pcm[n]=sum/6;}
 tracks.push({file,sha256:row.receipt.sha256,analysis:analyzeTrack(pcm,8000,row.receipt.sha256)});
}
const candidates=[];for(const a of tracks)for(const b of tracks){if(a===b)continue;const p=planTransition(a.analysis,b.analysis,a.analysis.mixBounds.start,1,0);if(p.fade>=7)candidates.push({files:[a,b],plan:p,keyAgreement:a.analysis.keyEstimate===b.analysis.keyEstimate});}
assert.ok(candidates.length,'Need an eligible real pair to verify the long overlap');candidates.sort((a,b)=>Number(b.keyAgreement)-Number(a.keyAgreement));
const chosen=candidates[0];await writeFile(new URL('overlap-selection.json',import.meta.url),JSON.stringify({scope:'First qualified instrumental pair, preferring matching estimated key; no human compatibility claim. All masters verified; trial raw archive remains incomplete.',eligiblePairs:candidates.length,...chosen},null,2)+'\n');console.log(chosen.files.map(t=>t.file),chosen.plan);
