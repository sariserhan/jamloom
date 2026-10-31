import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validateStudy,loadStudy} from '../scripts/neural-study-input';

function manifest(){
 const sources=Array.from({length:20},(_,i)=>({id:'source-'+i,path:'renders/source-'+i+'.wav',original:'renders/source-'+i+'.wav',sha256:'a'.repeat(64),original_sha256:'a'.repeat(64),seconds:.5,kind:i===17?'laughter':i===18?'claps':i===19?'noise':'speech',license:{id:'CC0-1.0'}}));
 return {schema:'jamloom-neural-qualification-1',sources,fixtures:sources.flatMap(s=>[['jazz','low'],['funk','medium'],['drumandbass','high']].map(([genre,energy])=>({source_id:s.id,label:s.id+'-'+genre,genre,energy,voice:'male',duration_seconds:45,visibility:'private'}))),stage_size:10,stages:6,max_stage_usd:3,max_workers:1,max_stage_seconds:2400,shutdown_seconds:130,repeated_requests:0,stop_on_failure:true,training:false,publication:false,image:'ghcr.io/sariserhan/jamloom/music-worker@sha256:'+'b'.repeat(64)};
}
test('all stages partition every source/direction once within the approved bounds',()=>{
 const m=manifest(),rows=Array.from({length:6},(_,i)=>validateStudy(m,i+1).fixtures).flat();
 assert.deepEqual(rows,m.fixtures);assert.equal(new Set(rows.map(r=>r.label)).size,60);
 for(const change of [{stage_size:11},{max_workers:2},{max_stage_usd:4},{training:true},{publication:true},{image:'latest'}])assert.throws(()=>validateStudy({...m,...change},1));
 assert.throws(()=>validateStudy(m,7));assert.throws(()=>validateStudy({...m,fixtures:m.fixtures.slice(1)},1));
 const altered=structuredClone(m);altered.fixtures[0].energy='high';assert.throws(()=>validateStudy(altered,1));
});
test('local loading verifies exact canonical source bytes and rejects changed or escaped inputs',async()=>{
 const root=await mkdtemp(join(tmpdir(),'jamloom-neural-input-'));
 try{
  await mkdir(join(root,'renders'));const m=manifest(),wav=Buffer.alloc(16044);
  wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(16000,40);
  const sha=createHash('sha256').update(wav).digest('hex');for(const s of m.sources){s.sha256=sha;s.original_sha256=sha;await writeFile(join(root,s.path),wav);}
  const path=join(root,'manifest.json');await writeFile(path,JSON.stringify(m));assert.equal((await loadStudy(root,path,1)).audio.size,20);
  await writeFile(join(root,m.sources[0].path),Buffer.from('changed'));await assert.rejects(loadStudy(root,path,1),/Study source changed/);
  await writeFile(join(root,'outside.wav'),wav);m.sources[0].path='outside.wav';await writeFile(path,JSON.stringify(m));await assert.rejects(loadStudy(root,path,1),/inside local renders/);
 }finally{await rm(root,{recursive:true,force:true});}
});
