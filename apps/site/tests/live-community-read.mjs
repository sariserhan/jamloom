// Read-only qualification of the same public collections used by the phone.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
const base='https://www.jamloom.com',rows=new Map(),collections=[],checks=[];
async function audio(path,range=true){
 let url=base+path;
 for(let attempt=0;attempt<3;attempt++){
  const response=await fetch(url,{redirect:'manual',headers:{'X-Jamloom-DNA':'1',...(range?{Range:'bytes=0-43'}:{})},signal:AbortSignal.timeout(30000)});
  if([302,303,307,308].includes(response.status)){
   await response.body?.cancel();const next=new URL(response.headers.get('location'),url);
   assert.equal(next.protocol,'https:');assert.ok(next.origin===base||next.hostname.endsWith('.r2.cloudflarestorage.com'));url=next.href;continue;
  }
  assert.ok([200,206].includes(response.status),'Audio status '+response.status);return response;
 }
 throw Error('Too many audio redirects');
}
for(const [product,view] of [['taste','validation'],['taste','examples'],['improvise','validation'],['taste','public'],['improvise','public']]){
 let after='',pages=0,count=0;
 do {
  const response=await fetch(`${base}/api/${product}/song?view=${view}${after?'&after='+after:''}`,{headers:{'X-Jamloom-DNA':'1'},signal:AbortSignal.timeout(15000)});assert.equal(response.status,200);
  const body=await response.json();assert.ok(Array.isArray(body.songs));assert.notEqual(body.available,false);
  for(const song of body.songs){assert.match(song.id,/^[a-f0-9]{32}$/);rows.set(product+':'+song.id,{...song,product});count++;}
  assert.ok(!body.next||body.next!==after);after=body.next;assert.ok(++pages<=100);
 }while(after);
 collections.push({product,view,count,pages});
}
const sets=await fetch(base+'/api/ai-dj/sets',{signal:AbortSignal.timeout(15000)});assert.equal(sets.status,200);const setBody=await sets.json();assert.ok(Array.isArray(setBody.sets));
const fullChecked=new Set();
for(const row of rows.values()){
 const path=`/api/${row.product}/song?id=${row.id}&file=audio`,response=await audio(path),reader=response.body.getReader();let header=Buffer.alloc(0);
 try{while(header.length<44){const {done,value}=await reader.read();assert.ok(!done,'Truncated audio header');header=Buffer.concat([header,Buffer.from(value).subarray(0,44-header.length)]);}}finally{await reader.cancel();}
 assert.equal(header.toString('ascii',0,4),'RIFF');assert.equal(header.toString('ascii',8,12),'WAVE');
 const check={product:row.product,id:row.id,header:'PASS',fullHash:'NOT RUN'};
 if(!fullChecked.has(row.product)&&row.audioSha256&&row.audioBytes){
  const stream=await audio(path,false),hash=createHash('sha256');let bytes=0;
  for await(const chunk of stream.body){bytes+=chunk.byteLength;assert.ok(bytes<=row.audioBytes);hash.update(chunk);}
  assert.equal(bytes,row.audioBytes);assert.equal(hash.digest('hex'),row.audioSha256);check.fullHash='PASS';fullChecked.add(row.product);
 }
 checks.push(check);
}
const report={status:'PASS scoped public catalogue and audio delivery',checkedAt:new Date().toISOString(),collections,uniqueSongs:rows.size,publicDJSetCount:setBody.sets.length,audioChecks:checks,fullHashProducts:[...fullChecked],mutations:false,limitations:['Headers checked for every listed song; complete hashes checked for one song per product.','No human listening, authenticated private access, purchase or unpublished endpoint qualification.','An empty public DJ collection does not exercise a real public set stream.']};
assert.ok(process.env.JAMLOOM_COMMUNITY_REPORT);await writeFile(process.env.JAMLOOM_COMMUNITY_REPORT,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,songs:rows.size,fullHashProducts:[...fullChecked],publicDJSetCount:setBody.sets.length}));
