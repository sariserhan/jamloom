// Opt-in provider check: writes only random test keys and removes them in finally.
import '../scripts/env';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {djSessionStore,djRecordingKey,DJ_PART_BYTES} from '../lib/dj-session-store';
if(!process.argv.includes('--apply')||process.env.JAMLOOM_R2_TEST_BUCKET!=='jamloom-ai-dj-sessions')throw Error('Explicit session-bucket provider test acknowledgement required');
const fresh=process.argv.includes('--fresh-flow'),continuity=process.argv.includes('--continuity')||fresh,mime=continuity?'audio/webm;codecs=opus':'audio/mp4';
const store=djSessionStore(),id=randomUUID().replaceAll('-',''),key=djRecordingKey('provider-test-'+id,id,mime);
const capture=fresh?'../../renders/dj-continuity-flow-mix-20261026':continuity?'../../renders/dj-continuity-mix-20261026':null;
const bytes=await readFile(resolve(capture?capture+'/after.webm':'../../renders/ai-dj-recording-20261024/multipart-fixture-long.m4a'));
if(capture){const proof=JSON.parse(await readFile(resolve(capture+'/report.json'),'utf8'));assert.equal(proof.status,'PASS technical');assert.equal(proof.newGeneration,fresh);assert.equal(createHash('sha256').update(bytes).digest('hex'),proof.results.find((r:{name:string})=>r.name==='after').sha256);}
assert.ok(bytes.length>DJ_PART_BYTES&&bytes.length<DJ_PART_BYTES*2);
let upload:string|undefined,complete=false;const report:Record<string,unknown>={bucket:'jamloom-ai-dj-sessions',status:'RUNNING',bytes:bytes.length,parts:2,freshGeneration:fresh};
try{
 upload=await store.begin(key,mime);
 const first=await store.partURL(key,upload,1,DJ_PART_BYTES);
 const bad=await fetch(first,{method:'PUT',body:Buffer.from([0]),signal:AbortSignal.timeout(20000)});assert.equal(bad.status,403);
 for(let i=0;i<2;i++){
  const part=bytes.subarray(i*DJ_PART_BYTES,Math.min(bytes.length,(i+1)*DJ_PART_BYTES));
  const url=await store.partURL(key,upload,i+1,part.length);
  const preflight=await fetch(url,{method:'OPTIONS',headers:{Origin:'https://jamloom.com','Access-Control-Request-Method':'PUT'},signal:AbortSignal.timeout(20000)});assert.ok(preflight.ok);assert.equal(preflight.headers.get('access-control-allow-origin'),'https://jamloom.com');
  const put=await fetch(url,{method:'PUT',body:part,signal:AbortSignal.timeout(30000)});assert.ok(put.ok,'part upload');
 }
 const result=await store.complete(key,upload,2,bytes.length);complete=true;assert.equal(result.bytes,bytes.length);assert.equal(result.mime,mime);
 const playback=await store.playbackURL(key);const response=await fetch(playback,{signal:AbortSignal.timeout(30000)});assert.ok(response.ok);const returned=Buffer.from(await response.arrayBuffer());assert.deepEqual(returned,bytes);
 const range=await fetch(playback,{headers:{Range:'bytes=0-1023'},signal:AbortSignal.timeout(20000)});assert.equal(range.status,206);assert.deepEqual(Buffer.from(await range.arrayBuffer()),bytes.subarray(0,1024));
 const plain=new URL(playback);plain.search='';const denied=await fetch(plain,{signal:AbortSignal.timeout(20000)});assert.ok([400,401,403].includes(denied.status));
 const download=await fetch(await store.playbackURL(key,true),{headers:{Range:'bytes=0-0'},signal:AbortSignal.timeout(20000)});assert.match(download.headers.get('content-disposition')??'',new RegExp('attachment.*jamloom-dj-session\\.'+(continuity?'webm':'m4a')));
 report.status='PASS';report.sha256=createHash('sha256').update(returned).digest('hex');report.checks=['two signed parts finalized as one identical audio object','incorrect signed length rejected','production-origin CORS preflight','range playback','download filename','unsigned access denied'];report.object=result;
}finally{
 try{if(upload&&!complete)await store.abort(key,upload);}catch(error){if((error as Error).name!=='NoSuchUpload')throw error;}finally{await store.remove(key);}
const gone=await fetch(await store.playbackURL(key),{headers:{Range:'bytes=0-0'},signal:AbortSignal.timeout(20000)});assert.equal(gone.status,404);report.cleanup='PASS: own test object absent';
 const folder=resolve(continuity?'../../docs/evidence/continuity-followthrough-20261026':'../../docs/evidence/ai-dj-sessions-20261024');await mkdir(folder,{recursive:true});await writeFile(resolve(folder,fresh?'r2-fresh-provider.json':'r2-provider.json'),JSON.stringify(report,null,2)+'\n');
}
console.log('PASS: private multipart session recording, exact bytes, ranges, denial and cleanup');
