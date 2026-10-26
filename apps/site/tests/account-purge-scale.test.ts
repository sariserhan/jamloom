import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {mkdtemp,rm,readdir} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {createPool} from '../lib/database';import {migrate} from '../lib/migrations';import {localAudioStore} from '../lib/audio-store';import {requestDeletion} from '../lib/account-deletion';import {fulfillDeletion} from '../lib/account-purge';import {OWNER_EMAIL} from '../lib/admin-access';import {DJRecordings} from '../lib/dj-recordings';
test('large-account partial deletion resumes through the operator command without deleting another account',async()=>{
 const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');const admin=createPool(url.href),name='jamloom_purge_scale_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;const pool=createPool(url.href),directory=await mkdtemp(join(tmpdir(),'jamloom-purge-scale-')),store=localAudioStore(directory);
 try{await migrate(pool);for(const [id,email] of [['admin',OWNER_EMAIL],['bulk','bulk@example.test'],['other','other@example.test']])await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[id,email]);
  const ids=Array.from({length:1000},()=>randomUUID()),other=randomUUID();
  await pool.query("INSERT INTO tracks(id,owner_id,title,strategy,duration_ms) SELECT unnest($1::uuid[]),'bulk','Fixture','hiphop',20000",[ids]);
  await pool.query("INSERT INTO track_assets(track_id,request_id,owner_id,sha256,bytes,state,expires_at) SELECT id,gen_random_uuid(),'bulk',$1,3840044,'ready',now()-interval '1 hour' FROM tracks",['a'.repeat(64)]);
  for(const id of [...ids,other])for(const prefix of ['masters/','uploads/'])await store.put(prefix+id+'.wav',Buffer.from('disposable test object'));
  const ticket=await requestDeletion(pool,'http://localhost:3000','bulk',new Date(),true),recordings=new DJRecordings(pool,{remove:async()=>{throw Error('Unexpected DJ object');},abort:async()=>{throw Error('Unexpected multipart');}} as never);
  assert.equal((await fulfillDeletion(pool,store,recordings,'admin',ticket.id,'bulk')).status,'pending');
  await pool.query("UPDATE account_deletions SET started_at=now()-interval '20 minutes' WHERE owner_id='bulk'");
  let calls=0;const failing={...store,remove:async(key:string)=>{if(++calls===501)throw Error('Injected interruption after 500 objects');await store.remove(key);}};
  await assert.rejects(fulfillDeletion(pool,failing,recordings,'admin',ticket.id,'bulk'),/Injected interruption/);
  assert.equal((await pool.query("SELECT count(*)::int n FROM track_assets WHERE owner_id='bulk'")).rows[0].n,1000);
  const env={...process.env,DATABASE_URL:url.href,BETTER_AUTH_URL:'http://localhost:3000',BETTER_AUTH_SECRET:'local-only-purge-scale-test-secret-123456',JAMLOOM_LOCAL_OUTBOX:join(directory,'mail'),JAMLOOM_LOCAL_AUDIO_DIR:directory,JAMLOOM_DELETION_TARGET:url.host+url.pathname,R2_AI_DJ_BUCKET:'jamloom-ai-dj-sessions',R2_ACCOUNT_ID:'0'.repeat(32),R2_ACCESS_KEY_ID:'unused',R2_SECRET_ACCESS_KEY:'unused'};
  const result=await promisify(execFile)(process.execPath,['--import','tsx','scripts/fulfill-deletion.ts','admin',ticket.id,'bulk','--apply'],{env,timeout:60000});assert.equal(JSON.parse(result.stdout).status,'complete');
  for(const prefix of ['masters','uploads'])assert.deepEqual(await readdir(join(directory,prefix)),[other+'.wav']);
  assert.equal((await pool.query("SELECT count(*)::int n FROM track_assets WHERE owner_id='bulk'")).rows[0].n,0);
  console.log('PASS 1,000 tracks / 2,000 files, interruption after 500 removals, operator resume and unrelated-file preservation');
 }finally{await rm(directory,{recursive:true,force:true});await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();}
});
