import type {Pool} from 'pg';
export async function djBetaReadiness(pool:Pool,live=false){
 const workers=(await pool.query(`SELECT state,count(*)::int AS count,min(deadline) AS first_deadline,
 count(*) FILTER (WHERE heartbeat_at>now()-interval '15 seconds' AND deadline>now()+interval '90 seconds' AND observed_micros<budget_micros)::int AS fresh,
 coalesce(sum(observed_micros),0)::text AS observed,coalesce(sum(allocated_micros),0)::text AS allocated
 FROM dj_warm_workers WHERE billing_live=$1 AND (state<>'stopped' OR created_at>now()-interval '7 days') GROUP BY state`,[live])).rows;
 const sessions=(await pool.query(`SELECT count(*)::int AS active FROM dj_sessions WHERE billing_live=$1 AND state='active' AND heartbeat_at>now()-interval '75 seconds'`,[live])).rows[0].active;
 const jobs=(await pool.query(`SELECT b.state,count(*)::int AS count,count(*) FILTER (WHERE b.state='running' AND (b.lease_until<=now() OR b.deadline<=now()))::int AS expired,
 percentile_cont(.95) WITHIN GROUP (ORDER BY b.compute_ms) FILTER (WHERE b.compute_ms IS NOT NULL) AS p95_compute_ms
 FROM dj_session_batches b JOIN dj_sessions s ON s.id=b.session_id WHERE s.billing_live=$1 AND b.created_at>now()-interval '7 days' GROUP BY b.state`,[live])).rows;
 const fresh=workers.filter(w=>w.state==='ready').reduce((n,w)=>n+w.fresh,0),stopping=workers.filter(w=>w.state==='stopping').reduce((n,w)=>n+w.count,0),expired=jobs.reduce((n,j)=>n+j.expired,0);
 const healthy=fresh===1&&!stopping&&!expired;
 return {checkedAt:new Date().toISOString(),billing:live?'live':'test',runtime:healthy?'Worker heartbeat healthy':'Held',activeListeners:sessions,listenerLimit:2,freeListenerSlots:healthy?Math.max(0,2-sessions):0,workers,jobs,
 qualification:'Runtime health only. Continuous hosting, provider invoice reconciliation, musical and venue acceptance remain separate release gates.',
 costBoundary:'Observed rental charges include idle time; allocated costs cover metered jobs. Neither is a final invoice or complete operating cost.'};
}
