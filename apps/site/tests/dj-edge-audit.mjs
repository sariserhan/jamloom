// Offline study on retained originals. An edge grid cannot qualify the middle of a song.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {measureBeatGrid,validBeatGrid} from '../lib/ai-dj-beat-grid.ts';
import {planTransition} from '../lib/ai-dj-plan.ts';
import {analyzeContext} from '../../web/session-analysis.js';

const root='../..',out=root+'/renders/product-completion-20261027';await mkdir(out,{recursive:true});
const prior=JSON.parse(await readFile(root+'/docs/evidence/web-followup-20261027/dj-overlap-study.json','utf8'));
const rows={},pairs=[];
for(const [key,a] of Object.entries(prior.analyses)){
 const file=root+'/renders/dj-release-check-20261026-retry/'+key.replace(':','-')+'.wav';
 assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),a.sha256);
 const raw=execFileSync('ffmpeg',['-v','error','-i',file,'-ac','1','-ar','8000','-f','f32le','pipe:1'],{maxBuffer:4*1024*1024});
 const pcm=Float32Array.from({length:raw.length/4},(_,i)=>raw.readFloatLE(i*4)),edges={};
 const started=performance.now();
 for(const [role,start,end] of [['entry',a.mixBounds.start,Math.min(a.duration,a.mixBounds.start+24)],['exit',Math.max(0,a.mixBounds.end-24),a.mixBounds.end]]){
  const samples=pcm.subarray(Math.round(start*8000),Math.round(end*8000));
  if(samples.length<24*8000)continue;
  const estimate=analyzeContext(samples,8000).tempo.bpm,g=measureBeatGrid(samples,8000,estimate);
  if(!g)continue;
  const period=60/g.bpm;
  const grid={...g,offset:(g.offset+start)%period,entry:g.entry+start,exit:g.exit+start,hookSafe:false,regions:g.regions.map(r=>({...r,start:r.start+start,end:r.end+start}))};
  assert(validBeatGrid(grid));assert(grid.entry>=start&&grid.exit<=end);edges[role]=grid;
 }
 rows[key]={...a,edges,edgeCpuMs:performance.now()-started};console.log(key,Object.keys(edges));
}
for(const [key,b] of Object.entries(rows)){
 const [session,n]=key.split(':');if(n==='0')continue;const a=rows[session+':'+(Number(n)-1)];
 const before=planTransition(a,b,5,1,10);
 const after=planTransition({...a,grid:a.edges.exit??a.grid},{...b,grid:b.edges.entry??b.grid},5,1,10);
 assert(after.at>=11&&after.at+after.fade<=a.duration+5+.02&&after.offset+after.fade*after.rate<b.duration);
 pairs.push({from:session+':'+(Number(n)-1),to:key,before,after});
}
const report={status:'STUDY; no runtime adoption',tracks:rows,pairs,summary:{beforeBeat:pairs.filter(p=>p.before.technique==='beat-bass').length,afterBeat:pairs.filter(p=>p.after.technique==='beat-bass').length,changed:pairs.filter(p=>JSON.stringify(p.before)!==JSON.stringify(p.after)).length},limitations:['Previously inspected recordings; no independent beat labels','Same 25 ms timing and existing coverage gates','No fresh generation or new listening acceptance','Edge estimates cannot drive mid-track effects or vocals']};
await writeFile(out+'/edge-grid-study.json',JSON.stringify(report,null,2)+'\n');console.log(report.summary);
