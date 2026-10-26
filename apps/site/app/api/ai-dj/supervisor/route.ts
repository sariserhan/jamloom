import {services} from '../../../../lib/services';
import {audioStore} from '../../../../lib/audio-store';
import {DJSessions} from '../../../../lib/dj-sessions';
import {DJWarmWorker} from '../../../../lib/dj-warm-worker';
import {VastProvider} from '../../../../lib/vast-provider';
import {djSupervisor} from '../../../../lib/dj-supervisor';
export const runtime='nodejs';
export const maxDuration=180;
export const GET=(request:Request)=>djSupervisor(request,()=>{
 const {pool,config}=services(),store=audioStore(config);
 if(!store||!process.env.JAMLOOM_AI_DJ_BUDGET)throw Error('DJ supervision not configured');
 const budget=JSON.parse(process.env.JAMLOOM_AI_DJ_BUDGET),provider=new VastProvider(process.env.VASTAI_KEY??'');
 return {pool,databaseURL:config.databaseURL,sweep:async()=>{
  const results=[];
  // Reconcile both ledgers, including a stopped operator's prior billing mode.
  for(const live of [false,true])results.push(...await new DJWarmWorker(new DJSessions(pool,config.secret,store,budget,live,true),provider).sweep());
  return results;
 }};
});
