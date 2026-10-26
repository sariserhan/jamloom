// Reproduce planner decisions from the exact rejected originals; no audio generation or playback.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {analyzeTrack} from '../../../apps/site/lib/ai-dj-analysis.ts';
import {planTransition} from '../../../apps/site/lib/ai-dj-plan.ts';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const {build}=createRequire(new URL('../../../apps/site/package.json',import.meta.url))('esbuild');
const oldSource=execFileSync('git',['show','5cb9ba8:apps/site/lib/ai-dj-plan.ts'],{encoding:'utf8'});
const compiled=await build({stdin:{contents:oldSource,resolveDir:new URL('../../../apps/site/lib/',import.meta.url).pathname,loader:'ts'},bundle:true,format:'esm',write:false});
const before=(await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].contents).toString('base64'))).planTransition;
const root=new URL('../../../',import.meta.url),source=new URL('renders/dj-preferred-consistency-20261026/',root);
const run=JSON.parse(await readFile(new URL('report.json',source),'utf8')),tracks=[];
for(const sequence of [0,3,4,1,2,5]){
 const row=run.tracks[sequence],wav=await readFile(new URL(row.file,source));
 assert.equal(createHash('sha256').update(wav).digest('hex'),row.receipt.sha256);
 assert.equal(wav.length,11520044);assert.equal(wav.readUInt32LE(24),48000);
 const energy=[0,0];for(let i=44;i<wav.length;i+=4){energy[0]+=wav.readInt16LE(i)**2;energy[1]+=wav.readInt16LE(i+2)**2;}const channel=energy[1]>energy[0]?1:0;
 const samples=new Float32Array(60*8000);
 for(let i=0;i<samples.length;i++){let sum=0;for(let j=0;j<6;j++)sum+=wav.readInt16LE(44+(i*6+j)*4+channel*2)/32768;samples[i]=sum/6;}
 tracks.push({number:tracks.length+1,sequence,lyrics:row.receipt.model_comparison.parameters.lyrics,analysis:analyzeTrack(samples,8000,row.receipt.sha256)});
}
const transitions=[];let position=tracks[0].analysis.mixBounds.start,rate=1,now=0;
for(let i=0;i<5;i++){
 const out=tracks[i].analysis,incoming=tracks[i+1].analysis,plan=before(out,incoming,position,rate,now);
 const guarded=planTransition(out,incoming,position,rate,now,false,4,true);
 transitions.push({from:i+1,to:i+2,...plan,outgoingPosition:position+(plan.at-now)*rate,outgoingBpm:out.grid?.bpm??null,incomingBpm:incoming.grid?.bpm??null,reviewedInstrumentalEdges:!!out.review?.instrumentalEdges&&!!incoming.review?.instrumentalEdges,guarded});
 now=plan.at+plan.fade;position=plan.offset+plan.fade*plan.rate;rate=plan.rate;
}
const result={status:'PASS diagnostic reproduction; owner musical acceptance FAIL',beforeRevision:'5cb9ba8',beforePlanSha256:createHash('sha256').update(oldSource).digest('hex'),scope:'Historical planner and current vocal guard, same louder-channel analysis; browser resampling, ticks and decode timing excluded. Estimates are not human phrase or singing evidence.',tracks,transitions};
await writeFile(new URL('audit.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({lyricVariants:new Set(tracks.map(t=>t.lyrics)).size,transitions:transitions.map(t=>({from:t.from,to:t.to,before:t.technique,after:t.guarded.technique,ends:t.at+t.fade}))},null,2));
