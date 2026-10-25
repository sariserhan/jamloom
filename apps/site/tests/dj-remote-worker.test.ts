import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {checkDJRenderer,runRemoteDJBatch} from '../lib/dj-remote-worker';
import type {DJWarmWorker} from '../lib/dj-warm-worker';

test('renderer startup requires authenticated readiness and the pinned model',async()=>{
 let change:Record<string,unknown>={},status=200,calls=0;
 const fetcher:typeof fetch=async(url,options)=>{calls++;assert.equal(url,'http://127.0.0.1:8768/health');assert.equal(options?.redirect,'error');assert.equal((options?.headers as Record<string,string>).Authorization,'Bearer '+'a'.repeat(64));assert.ok(options?.signal);return Response.json({ready:true,code_revision:'ca1e85fe9430179831e6bc6be790c332190a3866',weights_revision:'19671f406d603126926c1b7e2adc169acbcade22',...change},{status});};
 await assert.rejects(checkDJRenderer('bad',fetcher),/token/);assert.equal(calls,0);
 await checkDJRenderer('a'.repeat(64),fetcher);
 for(change of [{ready:false},{weights_revision:'changed'},{code_revision:'changed'}])await assert.rejects(checkDJRenderer('a'.repeat(64),fetcher),/mismatch/);
 status=503;await assert.rejects(checkDJRenderer('a'.repeat(64),fetcher),/not ready/);
 await assert.rejects(checkDJRenderer('a'.repeat(64),async()=>Response.json({padding:'x'.repeat(2048)})),/large|limit|size/i);
});

test('remote worker binds receipts to claimed jobs and rejects corrupt or late output',async()=>{
 const job={session_id:'b'.repeat(32),sequence:2,seed:15,settings:{style:'house',energy:4,mood:'bright'},lease:'00000000-0000-4000-8000-000000000001'};
 const audio=Buffer.alloc(11520044);audio.write('RIFF');audio.writeUInt32LE(audio.length-8,4);audio.write('WAVEfmt ',8);audio.writeUInt32LE(16,16);audio.writeUInt16LE(1,20);audio.writeUInt16LE(2,22);audio.writeUInt32LE(48000,24);audio.writeUInt32LE(192000,28);audio.writeUInt16LE(4,32);audio.writeUInt16LE(16,34);audio.write('data',36);audio.writeUInt32LE(audio.length-44,40);for(let i=44;i<audio.length;i+=2)audio.writeInt16LE(Math.round(2000*Math.sin(Math.floor((i-44)/4)*2*Math.PI*220/48000)),i);
 let completed=0,stopped=0,cancelled=false,change:Record<string,unknown>={};
 const warm={sessions:{budget:{maxRuntimeMs:60000},claim:async()=>job},complete:async(_w:unknown,j:unknown,a:Buffer)=>{assert.equal(j,job);assert.deepEqual(a,audio);completed++;return cancelled?'cancelled':'completed';},stop:async()=>{stopped++;}} as unknown as DJWarmWorker;
 const fetcher:typeof fetch=async(url,options)=>{assert.equal(url,'http://127.0.0.1:8768/render');assert.equal(options?.redirect,'error');const body=JSON.parse(String(options?.body));assert.equal(body.request.mood,'bright');const receipt={version:1,engine:'c'.repeat(32),job:job.lease,request:body.request,code_revision:'ca1e85fe9430179831e6bc6be790c332190a3866',weights_revision:'19671f406d603126926c1b7e2adc169acbcade22',compute_ms:4,bytes:audio.length,sha256:createHash('sha256').update(audio).digest('hex'),...change};return new Response(audio,{headers:{'content-type':'audio/wav','content-length':String(audio.length),'x-jamloom-receipt':JSON.stringify(receipt)}});};
 const worker={id:'worker',lease:'lease'},run=()=>runRemoteDJBatch(warm,worker,'a'.repeat(64),undefined,fetcher);
 assert.equal((await run())?.sequence,2);assert.equal(completed,1);assert.equal(stopped,0);
 for(change of [{job:'wrong'},{request:{}},{sha256:'0'.repeat(64)},{compute_ms:30001},{compute_ms:0},{weights_revision:'changed'}])await assert.rejects(run,/receipt|does not match/);
 assert.equal(completed,1);assert.equal(stopped,6);
 change={};let attempts=0;const bodies:string[]=[];
 const lost:typeof fetch=async(url,options)=>{bodies.push(String(options?.body));if(++attempts===1)throw new TypeError('Connection lost after rendering');return fetcher(url,options);};
 await runRemoteDJBatch(warm,worker,'a'.repeat(64),undefined,lost);assert.equal(attempts,2);assert.equal(bodies[0],bodies[1]);assert.equal(completed,2);assert.equal(stopped,6);
 attempts=0;await assert.rejects(runRemoteDJBatch(warm,worker,'a'.repeat(64),undefined,async()=>{attempts++;throw new TypeError('Offline');}),/Offline/);assert.equal(attempts,2);assert.equal(stopped,7);
 attempts=0;await assert.rejects(runRemoteDJBatch(warm,worker,'a'.repeat(64),undefined,async()=>{attempts++;return new Response('Unavailable',{status:503});}),/Invalid renderer/);assert.equal(attempts,1);assert.equal(stopped,8);
 cancelled=true;assert.equal(await run(),null);assert.equal(stopped,8);
 await assert.rejects(runRemoteDJBatch(warm,worker,'bad'),/token/);
 assert.equal(await runRemoteDJBatch(warm,worker,'a'.repeat(64),AbortSignal.abort(),fetcher),null);
});
