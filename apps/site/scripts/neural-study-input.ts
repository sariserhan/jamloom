import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,realpath} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {checkSource} from '../lib/cloud-songs';
import type {Pool} from 'pg';

export type StudyFixture={label:string;source_id:string;genre:string;energy:string;voice:'male';duration_seconds:45;visibility:'private'};
type StudySource={id:string;path:string;sha256:string;original:string;original_sha256:string;seconds:number;kind:string;license:{id:string}};
const hash=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
export function validateStudy(value:any,stage:number){
 assert.equal(value?.schema,'jamloom-neural-qualification-1');
 assert.equal(value.stage_size,10);assert.equal(value.max_stage_usd,3);assert.equal(value.max_workers,1);
 assert.equal(value.max_stage_seconds,2400);assert.equal(value.shutdown_seconds,130);assert.equal(value.repeated_requests,0);assert.equal(value.stop_on_failure,true);
 assert.equal(value.training,false);assert.equal(value.publication,false);
 assert(/^ghcr\.io\/sariserhan\/jamloom\/music-worker@sha256:[a-f0-9]{64}$/.test(value.image));
 assert(Array.isArray(value.sources)&&value.sources.length>=20&&value.sources.length<=50);
 assert.equal(value.stages,Math.ceil(value.sources.length*3/10));
 assert(Number.isSafeInteger(stage)&&stage>=1&&stage<=value.stages);
 assert(Array.isArray(value.fixtures)&&value.fixtures.length===value.sources.length*3);
 const seen=new Set<string>(),labels=new Set<string>();
 for(const source of value.sources as StudySource[]){
  assert(/^[a-z0-9-]{1,100}$/.test(source.id)&&!seen.has(source.id));seen.add(source.id);
  assert(/^[a-f0-9]{64}$/.test(source.sha256)&&/^[a-f0-9]{64}$/.test(source.original_sha256));
  assert(Number.isFinite(source.seconds)&&source.seconds>=.5&&source.seconds<=5);
  assert(['CC-BY-4.0','CC0-1.0','PD-author'].includes(source.license?.id));
  const rows=value.fixtures.filter((r:StudyFixture)=>r.source_id===source.id);
  assert.equal(rows.length,3);
  for(const [i,[genre,energy]]of [['jazz','low'],['funk','medium'],['drumandbass','high']].entries()){
   const r=rows[i];assert.equal(r.genre,genre);assert.equal(r.energy,energy);assert.equal(r.voice,'male');
   assert.equal(r.duration_seconds,45);assert.equal(r.visibility,'private');assert.equal(r.label,source.id+'-'+genre);
   assert(!labels.has(r.label));labels.add(r.label);
  }
 }
 for(const kind of ['speech','laughter','claps','noise'])assert(value.sources.some((s:StudySource)=>s.kind===kind));
 return {manifest:value,fixtures:value.fixtures.slice((stage-1)*10,stage*10) as StudyFixture[],sources:value.sources as StudySource[]};
}
export async function loadStudy(root:string,path:string,stage:number){
 const raw=await readFile(path);assert(raw.length<=512*1024,'Study manifest exceeds limit');
 const study=validateStudy(JSON.parse(raw.toString()),stage),audio=new Map<string,Buffer<ArrayBuffer>>();
 const allowed=await realpath(resolve(root,'renders'));
 for(const source of study.sources){
  for(const [name,sha]of [[source.path,source.sha256],[source.original,source.original_sha256]]){
   assert(typeof name==='string');const resolved=await realpath(resolve(root,name));
   assert(resolved.startsWith(allowed+sep),'Study audio must stay inside local renders');
   const bytes=await readFile(resolved);assert.equal(hash(bytes),sha,'Study source changed');
   if(name===source.path){checkSource(bytes,bytes.length,sha);assert.equal((bytes.length-44)/32000,source.seconds);audio.set(source.id,bytes);}
  }
 }
 return {...study,audio,manifestSha256:hash(raw)};
}

export async function prepareStudyDispatch(pool:Pick<Pool,'query'>,id:string,ttl:number,remaining:number){
 assert(Number.isSafeInteger(ttl)&&ttl>0&&Number.isSafeInteger(remaining)&&remaining>0&&remaining<=2400);
 // Fixture queue time is outside the customer request clock. Once dispatch
 // intent is persisted, even a lost provider reply must never extend its lease.
 return pool.query("UPDATE cloud_song_runs SET deadline=now()+($2*interval '1 second') WHERE id=$1 AND provider_id IS NULL AND submitted_at IS NULL",[id,Math.min(ttl,remaining)]);
}
