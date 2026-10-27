// Retained originals only; compare a candidate planner without changing the shipping engine.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {analyzeTrack} from '../lib/ai-dj-analysis.ts';
import {planTransition} from '../lib/ai-dj-plan.ts';
const source=resolve('../../renders/dj-release-check-20261026-retry'),evidence=new URL(process.env.JAMLOOM_EVIDENCE_DIR??'../../../docs/evidence/web-followup-20261027/',import.meta.url);
const tracks=JSON.parse(await readFile(join(source,'tracks.json'),'utf8'));assert.equal(tracks.length,20);
const temp=await mkdtemp(join(tmpdir(),'jamloom-overlap-')),analyses=new Map(),rows=[];
try{
 const code=await readFile('lib/ai-dj-plan.ts','utf8');assert.equal(code.split('[32,16,4]').length,2);
 await build({stdin:{contents:code.replace('[32,16,4]','[32,16,8,4]'),loader:'ts',resolveDir:resolve('lib')},bundle:true,format:'esm',platform:'node',outfile:join(temp,'candidate.mjs')});
 const candidate=(await import(pathToFileURL(join(temp,'candidate.mjs')).href)).planTransition;
 for(const track of tracks){
  assert.match(track.session,/^[a-f0-9]{32}$/);assert.ok(Number.isInteger(track.sequence)&&track.sequence>=0&&track.sequence<10);
  const path=join(source,`${track.session}-${track.sequence}.wav`),bytes=await readFile(path);assert.equal(createHash('sha256').update(bytes).digest('hex'),track.sha256);
  const raw=execFileSync('ffmpeg',['-v','error','-i',path,'-ac','1','-ar','8000','-f','f32le','pipe:1'],{maxBuffer:4*1024*1024});
  const pcm=new Float32Array(raw.length/4);for(let i=0;i<pcm.length;i++)pcm[i]=raw.readFloatLE(i*4);
  analyses.set(track.session+':'+track.sequence,analyzeTrack(pcm,8000,track.sha256));
 }
 for(const track of tracks.filter(t=>t.sequence>0)){
  const a=analyses.get(track.session+':'+(track.sequence-1)),b=analyses.get(track.session+':'+track.sequence);
  const before=planTransition(a,b,5,1,10),after=candidate(a,b,5,1,10);
  assert.ok(after.at>=11&&after.at+after.fade<=10+a.duration-5+.02);assert.ok(after.offset+after.fade*after.rate<b.duration);
  rows.push({session:track.session,sequence:track.sequence,outgoing:a.sha256,incoming:b.sha256,before,after,changed:JSON.stringify(before)!==JSON.stringify(after)});
 }
 await mkdir(evidence,{recursive:true});await writeFile(new URL('dj-overlap-study.json',evidence),JSON.stringify({tracks:tracks.length,analyses:Object.fromEntries(analyses),sourcePlanSha256:createHash('sha256').update(code).digest('hex'),pairs:rows.length,changedPairs:rows.filter(r=>r.changed).length,rows,decision:'STUDY only; no engine change',limitations:['No fresh generation','Longer overlap is not proof of better sound','No new listening acceptance or sustained capacity claim']},null,2)+'\n');
 console.log(JSON.stringify({tracks:tracks.length,pairs:rows.length,changedPairs:rows.filter(r=>r.changed).length}));
}finally{await rm(temp,{recursive:true,force:true});}
