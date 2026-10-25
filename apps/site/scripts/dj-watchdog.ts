import './env';
import {createPool} from '../lib/database';
import {readConfig} from '../lib/config';
import {audioStore} from '../lib/audio-store';
import {DJSessions} from '../lib/dj-sessions';
import {DJWatchdog} from '../lib/dj-watchdog';
import {VastProvider} from '../lib/vast-provider';
const config=readConfig(),url=new URL(config.databaseURL),target=url.host+url.pathname,apply=process.argv.includes('--apply');
if(apply&&process.env.JAMLOOM_WATCHDOG_TARGET!==target)throw Error('Watchdog target confirmation does not match');
const store=audioStore(config);if(!store||!process.env.JAMLOOM_AI_DJ_BUDGET)throw Error('DJ worker configuration missing');
const pool=createPool(config.databaseURL);
try{
 const sessions=new DJSessions(pool,config.secret,store,JSON.parse(process.env.JAMLOOM_AI_DJ_BUDGET));
 const provider=apply?new VastProvider(process.env.VASTAI_KEY??''):{inventory:async()=>{throw Error('Preview only');},destroy:async()=>{throw Error('Preview only');}};
 console.log(JSON.stringify({target,apply,results:await new DJWatchdog(sessions,provider).sweep(apply)},null,2));
}finally{await pool.end();}
