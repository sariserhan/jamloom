// Analyse retained GPU audio for the offline padding regression; no generation.
import {resolve} from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';import {spawnSync} from 'node:child_process';import {analyzeTrack} from '../lib/ai-dj-analysis.ts';import {planTransition} from '../lib/ai-dj-plan.ts';
const root=resolve('../..'),folder=root+'/renders/ai-dj-beta-20261025',r=JSON.parse(await readFile(folder+'/result.json','utf8')),sets=[];
for(const customer of r.customers){let at=0,offset=0,rate=1;const tracks=[];for(const t of r.tracks.filter(t=>t.session===customer.session).sort((a,b)=>a.sequence-b.sequence)){
 const file=folder+'/'+t.session+'-'+t.sequence+'.wav',pcm=spawnSync('ffmpeg',['-v','error','-i',file,'-af','pan=mono|c0=c0','-ar','8000','-f','f32le','-'],{maxBuffer:4*1024**2});if(pcm.status!==0)throw Error(pcm.stderr);const bytes=pcm.stdout;const a=analyzeTrack(new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length)),8000,t.sha256);tracks.push({file,analysis:a});
 }const plans=[];offset=tracks[0].analysis.audible.start;
 const starts=[{at,offset,rate}];for(let i=1;i<tracks.length;i++){const p=planTransition(tracks[i-1].analysis,tracks[i].analysis,offset,rate,at);plans.push(p);at=p.at;offset=p.offset;rate=p.rate;starts.push({at,offset,rate});}sets.push({visibility:customer.visibility,tracks,plans,starts,duration:at+(tracks.at(-1).analysis.audible.end-offset)/rate});
}
await writeFile(root+'/renders/ai-dj-beta-20261025/padding-analysis.json',JSON.stringify(sets,null,2));console.log(sets.map(s=>({visibility:s.visibility,edges:s.tracks.map(t=>t.analysis.audible),techniques:s.plans.map(p=>p.technique),duration:s.duration})));
