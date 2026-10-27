// An offline selection study. Never reorder a customer's generated sequence or change the shipping mixer.
import {readFile,writeFile,mkdir} from 'node:fs/promises';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';import {resolve,join} from 'node:path';
import {planTransition} from '../lib/ai-dj-plan.ts';import {trackLevel,validAnalysis} from '../lib/ai-dj-analysis.ts';
const root=resolve('../..'),report=JSON.parse(await readFile(join(root,'docs/evidence/web-followup-20261027/dj-overlap-study.json'),'utf8')),folder=join(root,'renders/product-improvements');await mkdir(folder,{recursive:true});
const tracks=Object.entries(report.analyses).map(([key,analysis])=>({key,analysis}));assert.equal(tracks.length,20);
for(const {key,analysis} of tracks){const [session,sequence]=key.split(':'),bytes=await readFile(join(root,`renders/dj-release-check-20261026-retry/${session}-${sequence}.wav`));assert.equal(createHash('sha256').update(bytes).digest('hex'),analysis.sha256);assert(validAnalysis(analysis,analysis.sha256));}
const mean=(a,start,end)=>{const values=a.energy.slice(Math.max(0,Math.floor(start)),Math.ceil(end));return Math.sqrt(values.reduce((s,n)=>s+n*n,0)/Math.max(1,values.length))*trackLevel(a);};
function pair(out,incoming){const plan=planTransition(out.analysis,incoming.analysis,5,1,10),finish=5+plan.at-10+plan.fade;
 const outgoing=mean(out.analysis,finish-plan.fade,finish),next=mean(incoming.analysis,plan.offset,plan.offset+plan.fade*plan.rate);
 const energyDifferenceDb=20*Math.log10(Math.max(.00001,next)/Math.max(.00001,outgoing));
 return {from:out.key,to:incoming.key,plan,energyDifferenceDb,score:(plan.technique==='short-fade'?10:0)+Math.abs(energyDifferenceDb)};}
const original=[],selected=[],sequences=[];
for(const session of [...new Set(tracks.map(t=>t.key.split(':')[0]))]){
 const group=tracks.filter(t=>t.key.startsWith(session+':')).sort((a,b)=>Number(a.key.split(':')[1])-Number(b.key.split(':')[1]));
 for(let i=1;i<group.length;i++)original.push(pair(group[i-1],group[i]));
 const remaining=group.slice(1),order=[group[0]];
 while(remaining.length){const candidates=remaining.map((track,index)=>({index,pair:pair(order.at(-1),track)})).sort((a,b)=>a.pair.score-b.pair.score||a.index-b.index);const best=candidates[0];selected.push(best.pair);order.push(remaining.splice(best.index,1)[0]);}
 assert.equal(new Set(order.map(t=>t.key)).size,10);sequences.push(order.map(t=>t.key));
}
const summary=rows=>({handoffs:rows.length,measuredBeatHandoffs:rows.filter(r=>r.plan.technique!=='short-fade').length,meanAbsoluteEnergyDifferenceDb:rows.reduce((s,r)=>s+Math.abs(r.energyDifferenceDb),0)/rows.length});
const data={status:'PASS analysis; musical improvement NOT RUN',source:'Retained release-qualification originals; hashes verified',before:summary(original),candidate:summary(selected),original,selected,sequences,limitations:['Energy is not perceived intensity, harmonic compatibility or arrangement quality','Uses future knowledge of a finite library; not an endless live-generation improvement','No forced grid, relaxed thresholds, paid generation, customer reorder or runtime change']};
await writeFile(join(folder,'dj-compatibility.json'),JSON.stringify(data,null,2));console.log(JSON.stringify({before:data.before,candidate:data.candidate}));
