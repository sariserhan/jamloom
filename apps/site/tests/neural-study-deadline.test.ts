import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPool} from '../lib/database';
import {prepareStudyDispatch} from '../scripts/neural-study-input';

test('study fixture queue delay never extends a submitted or ambiguously dispatched job',async()=>{
 const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');
 const pool=createPool(url.href),db=await pool.connect();
 try{
  await db.query('BEGIN');await db.query('CREATE TEMP TABLE cloud_song_runs(id text PRIMARY KEY,deadline timestamptz,provider_id text,submitted_at timestamptz) ON COMMIT DROP');
  await db.query("INSERT INTO cloud_song_runs VALUES ('fresh',now()-interval '1 hour',NULL,NULL),('lost',now()-interval '1 hour',NULL,now()),('running',now()-interval '1 hour','provider-id',now())");
  const before=(await db.query('SELECT id,deadline FROM cloud_song_runs ORDER BY id')).rows;
  for(const id of ['fresh','lost','running'])await prepareStudyDispatch(db,id,1200,300);
  const after=(await db.query('SELECT id,deadline,extract(epoch FROM deadline-now()) AS remaining FROM cloud_song_runs ORDER BY id')).rows;
  assert.equal(Number(after[0].remaining),300);
  assert.equal(after[1].deadline.getTime(),before[1].deadline.getTime());assert.equal(after[2].deadline.getTime(),before[2].deadline.getTime());
 }finally{await db.query('ROLLBACK');db.release();await pool.end();}
});
