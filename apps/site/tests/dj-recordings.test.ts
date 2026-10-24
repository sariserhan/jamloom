import test from 'node:test';import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {createPool} from '../lib/database';import {migrate} from '../lib/migrations';
import {DJRecordings,recordingInput,DJ_RECORDING_BYTES} from '../lib/dj-recordings';
import {djRecordingRequest} from '../lib/dj-recordings-http';
import {DJ_PART_BYTES} from '../lib/dj-session-store';
const id=()=>randomUUID().replaceAll('-',''),sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
test('recording metadata rejects missing permission, malformed identity and unsafe bounds',()=>{
 const input={id:id(),title:'Rooftop Friday',mime:'audio/mp4',bytes:32,sha256:'a'.repeat(64),seconds:1,consent:true};
 assert.equal(recordingInput(input).title,input.title);
 for(const change of [{consent:false},{id:'../path'},{title:' '},{title:'x'.repeat(81)},{mime:'text/html'},{bytes:NaN},{bytes:DJ_RECORDING_BYTES+1},{seconds:Infinity},{seconds:0},{seconds:3606},{sha256:'invalid'},{extra:true}])assert.throws(()=>recordingInput({...input,...change}));
});
test('isolated Postgres: owned multipart recordings, retry recovery, quotas and deletion',async t=>{
 const target=new URL(process.env.JAMLOOM_TEST_DATABASE_URL||'postgresql://localhost:5432/postgres');assert.ok(['localhost','127.0.0.1'].includes(target.hostname));
 const admin=createPool(target.toString()),name='jamloom_recordings_'+id();await admin.query(`CREATE DATABASE "${name}"`);target.pathname='/'+name;const pool=createPool(target.toString());
 const uploads=new Map<string,{key:string;parts:Map<number,Buffer>}>(),objects=new Map<string,Buffer>();let calls=0,completions=0,crash=false,failDelete=false;
 const store={
  async begin(key:string){calls++;const upload=id();uploads.set(upload,{key,parts:new Map()});return upload;},
  async partURL(key:string,upload:string,number:number,bytes:number){calls++;assert.equal(uploads.get(upload)?.key,key);return `https://storage.invalid/part?number=${number}&bytes=${bytes}`;},
  async complete(key:string,upload:string,count:number,bytes:number){calls++;completions++;const parts=uploads.get(upload)!.parts;assert.equal(parts.size,count);const data=Buffer.concat(Array.from({length:count},(_,i)=>parts.get(i+1)!));assert.equal(data.length,bytes);objects.set(key,data);uploads.delete(upload);if(crash){crash=false;throw Error('lost completion response');}return {bytes,mime:'audio/mp4',etag:'etag',parts:count};},
  async verify(key:string,bytes:number,checksum:string){calls++;const b=objects.get(key);if(!b)return false;assert.equal(b.length,bytes);assert.equal(sha(b),checksum);return true;},
  async abort(key:string,upload:string){calls++;uploads.delete(upload);},async remove(key:string){calls++;if(failDelete)throw Error('storage unavailable');objects.delete(key);},
  async playbackURL(key:string,download=false,title=''){calls++;assert.ok(objects.has(key));return `https://storage.invalid/audio?download=${download}&title=${encodeURIComponent(title)}`;},
 };
 const service=new DJRecordings(pool,store as any),bytes=Buffer.alloc(DJ_PART_BYTES+71,23),input={id:id(),title:'Rooftop Friday',mime:'audio/mp4',bytes:bytes.length,sha256:sha(bytes),seconds:330,consent:true};
 const upload=async(rid:string,data=bytes)=>{const row=(await pool.query('SELECT upload_id FROM dj_recordings WHERE id=$1',[rid])).rows[0];for(let at=0;at<data.length;at+=DJ_PART_BYTES)uploads.get(row.upload_id)!.parts.set(at/DJ_PART_BYTES+1,data.subarray(at,at+DJ_PART_BYTES));};
 try{
  assert.ok((await migrate(pool)).includes('0022_dj_recordings.sql'));assert.deepEqual(await migrate(pool),[]);
  for(const owner of ['alice','bob','quota'])await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[owner,owner+'@example.com']);
  await t.test('retry identity, owner isolation and immutable recording details',async()=>{
   const result=await service.reserve('alice',input);assert.equal(result.ready,false);const count=uploads.size;assert.equal((await service.reserve('alice',input)).id,input.id);assert.equal(uploads.size,count);
   const before=calls;for(const action of [()=>service.reserve('bob',input),()=>service.part('bob',input.id,1),()=>service.complete('bob',input.id),()=>service.playback('bob',input.id),()=>service.remove('bob',input.id)])await assert.rejects(action,/not found/);assert.equal(calls,before);
   await assert.rejects(service.reserve('alice',{...input,title:'different'}),/changed/);assert.deepEqual(await service.list('bob'),[]);
   await assert.rejects(service.part('alice',input.id,0),/Invalid/);await assert.rejects(service.part('alice',input.id,3),/Invalid/);
   assert.equal((await service.part('alice',input.id,1)).bytes,DJ_PART_BYTES);assert.equal((await service.part('alice',input.id,2)).bytes,71);await assert.rejects(service.playback('alice',input.id),/not found/);
  });
  await t.test('lost R2 completion response recovers once without completing or charging twice',async()=>{
   await upload(input.id);crash=true;await assert.rejects(service.complete('alice',input.id),/lost completion/);assert.equal((await service.list('alice'))[0].state,'finalizing');
   assert.equal((await service.reserve('alice',input)).finalizing,true);await assert.rejects(service.part('alice',input.id,1),/finishing/);
   const before=completions;await Promise.all([service.complete('alice',input.id),service.complete('alice',input.id)]);assert.equal(completions,before);assert.equal((await service.list('alice'))[0].state,'ready');assert.equal((await service.reserve('alice',input)).ready,true);
   assert.match(await service.playback('alice',input.id,true),/title=Rooftop%20Friday/);
  });
  await t.test('authenticated HTTP boundary, account switch, size limit, CSRF and private headers',async()=>{
   const context=(owner:string|null)=>async()=>({owner,origin:'https://jamloom.test',recordings:service});
   const req=(method='GET',body:unknown=undefined,origin='https://jamloom.test')=>new Request('https://jamloom.test/api/ai-dj/recordings',{method,headers:{origin,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
   assert.equal((await djRecordingRequest(req(),context(null))).status,401);
   assert.equal((await djRecordingRequest(req('POST',{...input,owner:'alice'}),context('bob'))).status,409);
   assert.equal((await djRecordingRequest(req('DELETE',{owner:'alice'}),context('bob'),[input.id])).status,409);
   assert.equal((await djRecordingRequest(req('DELETE',{}),context('alice'),[input.id])).status,400);
   assert.equal((await djRecordingRequest(req('DELETE',{owner:'bob'}),context('bob'),[input.id])).status,404);
   assert.equal((await service.list('alice'))[0].state,'ready');
   assert.equal((await djRecordingRequest(req('POST',input,'https://evil.test'),context('alice'))).status,403);
   assert.equal((await djRecordingRequest(req('POST',{payload:'x'.repeat(17000)}),context('alice'))).status,413);
   assert.equal((await djRecordingRequest(req(),context('bob'),[input.id,'audio'])).status,404);
   const result=await djRecordingRequest(req(),context('alice'));assert.match(result.headers.get('cache-control')!,/private.*no-store/);assert.equal((await result.json()).recordings.length,1);
   const audio=await djRecordingRequest(req(),context('alice'),[input.id,'audio']);assert.equal(audio.status,307);
  });
  await t.test('deletion retries provider failures and blocks new upload/playback grants',async()=>{
   failDelete=true;await assert.rejects(service.remove('alice',input.id),/storage unavailable/);await assert.rejects(service.playback('alice',input.id),/not found/);await assert.rejects(service.part('alice',input.id,1),/removed/);failDelete=false;
   assert.equal((await service.cleanup()).cleaned,1);await service.remove('alice',input.id);assert.equal(objects.size,0);assert.equal((await service.list('alice')).length,0);
   await assert.rejects(service.reserve('alice',input),/changed|removed/);
  });
  await t.test('concurrent reservations respect quota and expired uploads are aborted',async()=>{
   const results=await Promise.allSettled(Array.from({length:12},()=>service.reserve('quota',{...input,id:id()})));assert.equal(results.filter(r=>r.status==='fulfilled').length,10);
   const q=await service.list('quota');assert.equal(q.length,10);await pool.query("UPDATE dj_recordings SET expires_at=now()-interval '1 hour' WHERE owner_id='quota'");await assert.rejects(service.complete('quota',q[0].id),/expired/);
   assert.equal((await service.cleanup()).cleaned,10);assert.equal(uploads.size,0);
  });
  await t.test('account deletion cannot silently orphan R2 recordings',async()=>{
   await assert.rejects(pool.query('DELETE FROM "user" WHERE id=$1',['alice']),/foreign key/);
   await assert.rejects(service.purgeOwner('alice'),/Suspend/);await pool.query('UPDATE "user" SET suspended=true WHERE id=$1',['alice']);await assert.rejects(service.reserve('alice',{...input,id:id()}),/sign-in/);
   await service.purgeOwner('alice');await pool.query('DELETE FROM "user" WHERE id=$1',['alice']);
  });
 }finally{await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();}
});
