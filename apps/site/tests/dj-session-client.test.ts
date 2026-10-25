import test from 'node:test';
import assert from 'node:assert/strict';
import {DJSessionClient} from '../lib/dj-session-client';

test('starting direction is requoted without accepting a higher price',async()=>{
 const original=globalThis.fetch;
 try{for(const [credits,energy,mood] of [[2,5,'warm'],[3,5,'warm'],[2,4,'deep']] as const){
  const calls:{url:string;body:any}[]=[],client=new DJSessionClient({owner:'test',input:{id:'a'.repeat(32),title:'Party',style:'house',energy:4,visibility:'public'},quote:{credits:2,privacyCredits:0,token:'original',expiresAt:Date.now()+100000}},()=>{});
  globalThis.fetch=async(input,options)=>{const url=String(input),body=options?.body?JSON.parse(String(options.body)):undefined;calls.push({url,body});return Response.json(url.endsWith('/quote')?{credits,privacyCredits:0,token:'updated',expiresAt:Date.now()+100000}:url.endsWith('/start')||url.endsWith('/stop')?{}:{state:'active',batches:[{sequence:0,state:'completed',ready:true,audio_sha256:'b'.repeat(64)}]});};
  try{const pending=client.source({energy,mood,vocals:true},new AbortController().signal);
   if(credits===3){await assert.rejects(pending,/price increased/);assert.equal(calls.some(c=>c.url.endsWith('/start')),false);}
   else{assert.equal((await pending)?.sequence,0);const start=calls.find(c=>c.url.endsWith('/start'))!;assert.equal(start.body.token,'updated');assert.equal(start.body.input.mood,mood);assert.equal(start.body.input.energy,energy);}
  }finally{await client.stop();}
 }}finally{globalThis.fetch=original;}
});
