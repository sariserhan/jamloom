// Test-only provider substitute. Receipts are synthetic; audio is retained, never fresh generation.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

export async function retainedRenderer(root) {
 const rows=[];
 for(const name of ['dj-continuity-flow-20261026','dj-flow-qualification-20261026']){
  const folder=resolve(root,'renders',name),report=JSON.parse(await readFile(resolve(folder,'report.json'),'utf8'));
  for(const row of report.tracks){
   assert.match(row.file,/^house-\d+\.wav$/);
   const hash=row.receipt.sha256;
   if(!rows.some(r=>r.sha256===hash))rows.push({path:resolve(folder,row.file),sha256:hash});
  }
 }
 assert(rows.length>=20);const used=new Map(),proof=[];
 return {proof,fetch:async(url,options)=>{
  assert.equal(url,'http://127.0.0.1:8768/render');const body=JSON.parse(options.body);
  const payload=JSON.stringify(body),prior=used.get(body.job);
  if(prior)assert.equal(prior.payload,payload,'A retry must preserve its request');
  else {assert(used.size<20,'Retained rehearsal request cap');used.set(body.job,{payload,row:rows[used.size]});}
  const row=used.get(body.job).row,audio=await readFile(row.path);
  assert.equal(audio.length,11520044);assert.equal(createHash('sha256').update(audio).digest('hex'),row.sha256);
  const receipt={version:1,job:body.job,request:body.request,code_revision:'ca1e85fe9430179831e6bc6be790c332190a3866',
   weights_revision:'19671f406d603126926c1b7e2adc169acbcade22',engine:'f'.repeat(32),compute_ms:1,bytes:audio.length,sha256:row.sha256,
   retained_rehearsal:true};
  if(!prior)proof.push({session:body.request.session,sequence:body.request.sequence,source:row.path,sha256:row.sha256,newGeneration:false});
  return new Response(audio,{headers:{'content-type':'audio/wav','content-length':String(audio.length),'x-jamloom-receipt':JSON.stringify(receipt)}});
 }};
}
