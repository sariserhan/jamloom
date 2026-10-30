import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rejectedAudioDiagnostic} from '../scripts/rejected-audio-diagnostic';
import type {RunpodJob,RunpodResult} from '../lib/runpod-provider';

test('private diagnostic capture precedes failed-job cleanup without accepting or resubmitting',async()=>{
 let submitted=0,saved=0,gets=0;
 const failure:RunpodResult={id:'provider-fixture',status:'FAILED',failure:'style-rejected:matched-1-of-4'};
 const provider={submit:async(job:RunpodJob)=>{submitted++;assert.equal(job.retain_rejected_audio,true);return {id:failure.id,status:'IN_QUEUE'} as RunpodResult;},status:async()=>failure,cancel:async()=>failure,health:async()=>({}),dispatchEnabled:async()=>true};
 const wrapped=rejectedAudioDiagnostic(provider,{get:async(key,bytes)=>{gets++;assert.equal(key,'uploads/11111111-1111-4111-8111-111111111111.wav');return Buffer.alloc(bytes);}},async(id,audio)=>{saved++;assert.equal(id,'a'.repeat(32));assert.equal(audio.length,19200044);});
 const job:RunpodJob={id:'a'.repeat(32),product:'music-dna',timeout_seconds:900,output_url:'https://example.invalid/bucket/uploads/11111111-1111-4111-8111-111111111111.wav?secret=private',payload:{duration_seconds:100}};
 await wrapped.submit(job);assert.equal(await wrapped.status(failure.id),failure);await wrapped.status(failure.id);
 assert.deepEqual([submitted,saved,gets],[1,1,1]);
 await assert.rejects(wrapped.submit({...job,product:'improvise'}));
 assert.equal(submitted,1);
});
