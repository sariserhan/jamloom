import test from 'node:test';
import assert from 'node:assert/strict';
import {DJSessionClient,sessionPrice,sessionRate} from '../lib/dj-session-client';

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


test('carried DJ allowance may top up within the accepted maximum, but a higher tariff or maximum needs approval',async()=>{
 const original=globalThis.fetch,base={availableMicros:500000,chargeMicros:50000,maxCredits:1,minMicrosPer10kCredits:5000000000,topUpMinutes:0};
 try{for(const change of [{credits:1,djAllowance:{...base,availableMicros:0,topUpMinutes:10}},{credits:1,djAllowance:{...base,minMicrosPer10kCredits:3500000000}},{credits:1,djAllowance:{...base,maxCredits:2}},{credits:0,djAllowance:{...base,chargeMicros:62500}},{credits:1}]){
  const calls:string[]=[],client=new DJSessionClient({owner:'test',input:{id:'a'.repeat(32),title:'Party',style:'house',energy:4,visibility:'public'},quote:{credits:0,privacyCredits:0,token:'original',expiresAt:Date.now()+100000,djAllowance:base}},()=>{});
  globalThis.fetch=async input=>{const url=String(input);calls.push(url);return Response.json(url.endsWith('/quote')?{...change,privacyCredits:0,token:'updated',expiresAt:Date.now()+100000}:url.endsWith('/start')||url.endsWith('/stop')?{}:{state:'active',batches:[{sequence:0,state:'completed',ready:true,audio_sha256:'b'.repeat(64)}]});};
  try{const result=client.source({energy:5,mood:'warm',vocals:true},new AbortController().signal);
   if(change.djAllowance?.maxCredits===1&&change.djAllowance.chargeMicros===50000&&change.djAllowance.minMicrosPer10kCredits===5000000000){assert.equal((await result)?.sequence,0);assert.ok(calls.some(c=>c.endsWith('/start')));}
   else{await assert.rejects(result,/price increased/);assert.equal(calls.some(c=>c.endsWith('/start')),false);}
  }finally{await client.stop();}
 }}finally{globalThis.fetch=original;}
});

test('DJ price labels distinguish generated time, carried allowance and a whole-credit top-up',()=>{
 const q={credits:1,privacyCredits:0,token:'test',expiresAt:Date.now()+100000,djAllowance:{availableMicros:0,chargeMicros:50000,maxCredits:1,minMicrosPer10kCredits:5000000000,topUpMinutes:10}};
 assert.equal(sessionPrice(q),'1 credit adds 10 generated min');assert.equal(sessionRate(q),'At least 10 generated min per credit');
 assert.equal(sessionPrice({...q,credits:0,djAllowance:{...q.djAllowance,availableMicros:299999,topUpMinutes:0}}),'5.9 generated min available · no top-up now');
 assert.equal(sessionPrice({...q,credits:0,djAllowance:{...q.djAllowance,maxCredits:0}}),'No credits required for this account');
 assert.equal(sessionPrice({...q,djAllowance:undefined}),'1 credit maximum per generated minute');
});

test('beat instructions travel with the next request and playback uses delivered batch metadata',async()=>{
 const original=globalThis.fetch,calls:any[]=[],beat={bpm:126,groove:'syncopated' as const};let sequence=0;
 const client=new DJSessionClient({owner:'test',input:{id:'a'.repeat(32),title:'Party',style:'house',energy:4,mood:'deep',visibility:'public'},quote:{credits:2,privacyCredits:0,token:'original',expiresAt:Date.now()+100000}},()=>{});
 globalThis.fetch=async(input,options)=>{const url=String(input),body=options?.body?JSON.parse(String(options.body)):undefined;calls.push({url,body});if(url.endsWith('/next'))sequence=body.sequence;return Response.json(options?.method==='POST'?{}:{state:'active',batches:[{sequence,state:'completed',ready:true,audio_sha256:String(sequence).repeat(64),beat:sequence?beat:undefined}]});};
 try{await client.source({energy:4,mood:'deep',vocals:true},new AbortController().signal);const result=await client.source({energy:4,mood:'deep',vocals:true,beat},new AbortController().signal);assert.deepEqual(calls.find(c=>c.url.endsWith('/next')).body.beat,beat);assert.deepEqual(result?.track.beat,beat);assert.equal(calls.filter(c=>c.url.endsWith('/next')).length,1);}finally{await client.stop();globalThis.fetch=original;}
});
