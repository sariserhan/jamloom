// Explicit real R2 multipart/range verification; synthetic audio is always removed.
import '../scripts/env.ts';import assert from 'node:assert/strict';import {randomUUID,createHash} from 'node:crypto';import {readFile,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';import {djSessionStore,djRecordingKey,DJ_PART_BYTES} from '../lib/dj-session-store.ts';
assert.ok(process.argv.includes('--apply'));const store=djSessionStore(),key=djRecordingKey('stream-provider-'+randomUUID(),randomUUID().replaceAll('-',''),'audio/mp4'),bytes=await readFile(resolve('../../renders/ai-dj-recording-20261024/multipart-fixture-long.m4a'));assert.ok(bytes.length>DJ_PART_BYTES&&bytes.length<2*DJ_PART_BYTES);const upload=await store.begin(key,'audio/mp4');
try{
 for(let at=0;at<bytes.length;at+=DJ_PART_BYTES){const part=bytes.subarray(at,at+DJ_PART_BYTES),url=await store.partURL(key,upload,at/DJ_PART_BYTES+1,part.length);assert.equal((await fetch(url,{method:'PUT',body:part,signal:AbortSignal.timeout(20000)})).status,200);}
 await store.complete(key,upload,2,bytes.length);assert.ok(await store.exists(key,bytes.length,'audio/mp4'));
 for(let at=0;at<bytes.length;at+=DJ_PART_BYTES){const part=bytes.subarray(at,at+DJ_PART_BYTES);await store.verifyPart(key,at/DJ_PART_BYTES+1,part.length,bytes.length,createHash('sha256').update(part).digest('hex'),'audio/mp4');}
 await assert.rejects(store.verifyPart(key,2,bytes.length-DJ_PART_BYTES,bytes.length,'f'.repeat(64),'audio/mp4'),/checksum changed/);
 const response=await fetch(await store.playbackURL(key));assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);
}finally{try{await store.abort(key,upload);}catch(e){if(e.name!=='NoSuchUpload')throw e;}await store.remove(key);}
assert.equal(await store.exists(key,bytes.length,'audio/mp4'),false);
await writeFile(resolve('../../docs/evidence/ai-dj-stream-flow-20261024/provider.json'),JSON.stringify({status:'PASS',scope:'Actual private R2 multipart completion, two SHA256-verified ranges, changed-checksum rejection and byte-identical download',bytes:bytes.length,parts:2,removed:true,noPublicPublication:true},null,2)+'\n');console.log('PASS: two real R2 parts verified, downloaded and removed');
