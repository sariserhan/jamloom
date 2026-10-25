import './env';
import {createPool} from '../lib/database';
import {readConfig} from '../lib/config';
import {audioStore} from '../lib/audio-store';
import {DJSessions} from '../lib/dj-sessions';
import {DJWatchdog} from '../lib/dj-watchdog';
import {DJWarmWorker} from '../lib/dj-warm-worker';
import {VastProvider} from '../lib/vast-provider';
import {setTimeout as delay} from 'node:timers/promises';
import {integer} from '../lib/economics';
const config=readConfig(),url=new URL(config.databaseURL),target=url.host+url.pathname,apply=process.argv.includes('--apply');
const watch=process.argv.includes('--watch'),until=Date.now()+integer(Number(process.env.JAMLOOM_DJ_SUPERVISOR_SECONDS??2400),1,2400)*1000;
if(watch&&(!apply||!process.argv.includes('--warm')))throw Error('Continuous supervision requires --apply --warm');
let stopped=false;process.once('SIGINT',()=>{stopped=true;});process.once('SIGTERM',()=>{stopped=true;});
if(apply&&process.env.JAMLOOM_WATCHDOG_TARGET!==target)throw Error('Watchdog target confirmation does not match');
const store=audioStore(config);if(!store||!process.env.JAMLOOM_AI_DJ_BUDGET)throw Error('DJ worker configuration missing');
const pool=createPool(config.databaseURL);
try{
 const sessions=new DJSessions(pool,config.secret,store,JSON.parse(process.env.JAMLOOM_AI_DJ_BUDGET));
 const provider=apply?new VastProvider(process.env.VASTAI_KEY??''):{inventory:async()=>{throw Error('Preview only');},destroy:async()=>{throw Error('Preview only');}};
 do{
 const results=process.argv.includes('--warm')
  ?apply?await new DJWarmWorker(sessions,provider).sweep():(await pool.query("SELECT id,state,deadline,heartbeat_at FROM dj_warm_workers WHERE state<>'stopped'")).rows
  :await new DJWatchdog(sessions,provider).sweep(apply);
 console.log(JSON.stringify({target,apply,results},null,2));
 if(!watch||stopped||Date.now()>=until)break;
 if(!(await pool.query("SELECT 1 FROM dj_warm_workers WHERE state<>'stopped' UNION ALL SELECT 1 FROM dj_session_batches WHERE state='running' AND warm_worker_id IS NOT NULL LIMIT 1")).rowCount)break;
 await delay(Math.min(3000,Math.max(0,until-Date.now())));
 }while(!stopped&&Date.now()<until);
}finally{await pool.end();}
