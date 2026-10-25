import {validationSongs} from './music-validation';
import examples from '../../../assets/manifests/dna-examples.json';
import type {Pool} from 'pg';
export async function operations(pool:Pool){
 const jobs=(await pool.query(`SELECT status,count(*)::int AS count,coalesce(sum(actual_cost_micros),0)::text AS cost,count(*) FILTER(WHERE actual_cost_micros IS NULL)::int AS unsettled FROM generation_reservations WHERE created_at>now()-interval '7 days' GROUP BY status ORDER BY status`)).rows;
 const refunds=(await pool.query(`SELECT kind,count(*)::int AS count,coalesce(sum(abs(available_delta)),0)::text AS credits FROM wallet_ledger_entries WHERE created_at>now()-interval '7 days' AND kind IN ('release','refund') GROUP BY kind ORDER BY kind`)).rows;
 const storage=(await pool.query(`WITH objects AS (
 SELECT bytes::bigint,created_at,'Uploaded mixes' AS source FROM track_assets WHERE state='ready'
 UNION ALL SELECT audio_bytes,completed_at,'Generated songs' FROM dna_song_jobs WHERE state='completed' AND audio_key IS NOT NULL
 UNION ALL SELECT bytes,completed_at,'DJ recordings' FROM dj_recordings WHERE state='ready'
 ) SELECT source,count(*)::int AS objects,coalesce(sum(bytes),0)::text AS bytes,coalesce(sum(bytes) FILTER(WHERE created_at>now()-interval '7 days'),0)::text AS added FROM objects GROUP BY source ORDER BY source`)).rows;
 const days=(await pool.query(`SELECT created_at::date::text AS day,count(*)::int AS jobs,count(*) FILTER(WHERE status='failed')::int AS failed,coalesce(sum(actual_cost_micros),0)::text AS cost FROM generation_reservations WHERE created_at>now()-interval '7 days' GROUP BY created_at::date ORDER BY day`)).rows;
 const curated=[...new Map([...validationSongs,...examples.examples].map(s=>[s.id,s])).values()];
 return {jobs,refunds,storage,days,curated:{objects:curated.length,bytes:curated.reduce((sum,s)=>sum+s.audioBytes,0)}};
}
