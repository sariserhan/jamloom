// Reuse the product analyzer; a requested BPM is not a verified musical grid.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {analyzeTrack,validAnalysis} from '../lib/ai-dj-analysis.ts';
const root='../..',campaign='dj-genre-models-20261027',source=root+'/renders/'+campaign;
const report=JSON.parse(await readFile(source+'/report.json','utf8'));
const plan=JSON.parse(await readFile(root+'/docs/evidence/'+campaign+'/gpu-plan.json','utf8'));
assert.equal(report.status,'PASS technical');assert.equal(report.cleanup_confirmed,true);assert.equal(report.tracks.length,6);
const rows=[];
for(const [i,row] of report.tracks.entries()){
 assert.equal(row.file.split('/').at(-1),row.file);assert.deepEqual(row.receipt.request,plan.tracks[i].request);
 const file=source+'/'+row.file,hash=createHash('sha256').update(await readFile(file)).digest('hex');assert.equal(hash,row.receipt.sha256);
 const raw=execFileSync('ffmpeg',['-v','error','-i',file,'-ac','1','-ar','8000','-f','f32le','pipe:1'],{maxBuffer:4*1024*1024});
 const pcm=Float32Array.from({length:raw.length/4},(_,i)=>raw.readFloatLE(i*4)),analysis=analyzeTrack(pcm,8000,hash);assert(validAnalysis(analysis,hash));
 const rms=values=>Math.sqrt(values.reduce((s,n)=>s+n*n,0)/values.length);
 rows.push({file:row.file,sha256:hash,style:row.receipt.request.style,model:row.receipt.model_comparison.model,
  requestedBpm:plan.tracks[i].bpm,analysis,entryRelativeDb:20*Math.log10(rms(analysis.energy.slice(0,8))/analysis.rms),
  exitRelativeDb:20*Math.log10(rms(analysis.energy.slice(-8))/analysis.rms),renderSeconds:row.receipt.compute_ms/1000,
  peakCudaAllocatedBytes:row.receipt.model_comparison.peak_cuda_allocated_bytes,peakCudaReservedBytes:row.receipt.model_comparison.peak_cuda_reserved_bytes});
 console.log(row.file,analysis.grid?.bpm??'No qualified grid');
}
assert(report.observed_debit_usd>=0&&report.observed_debit_usd<=3);
await writeFile(root+'/docs/evidence/'+campaign+'/audio-analysis.json',JSON.stringify({rows,
 provisionalTotalDebitUsd:report.observed_debit_usd,provisionalCostPerTechnicallySuccessfulOutputUsd:report.observed_debit_usd/rows.length,
 costPerListenerAcceptedOutputUsd:null,limitations:['Automatic tempo/key/energy estimates are not independent beat labels or musical quality','One seed per genre; no consistency or live capacity inference','Account debit may settle later; no final invoice claim']},null,2)+'\n');
