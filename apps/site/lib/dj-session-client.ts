import type {DJSessionInput} from './dj-session-input';
import type {DJTrackSource,DJSnapshot} from './ai-dj-player';
import type {DJAllowanceQuote} from './dj-allowance';
export type SessionQuote={token:string;credits:number;privacyCredits:number;expiresAt:number;djAllowance?:DJAllowanceQuote};
export function sessionPrice(q:SessionQuote){
 const a=q.djAllowance;if(!a)return `${q.credits} credit${q.credits===1?'':'s'} maximum per generated minute`;
 if(a.maxCredits===0)return 'No credits required for this account';
 const minutes=new Intl.NumberFormat('en',{maximumFractionDigits:1,roundingMode:'floor'});
 return q.credits?`${q.credits} credit${q.credits===1?' adds':'s add'} ${minutes.format(a.topUpMinutes)} generated min`:`${minutes.format(a.availableMicros/a.chargeMicros)} generated min available · no top-up now`;
}
export function sessionRate(q:SessionQuote){
 const a=q.djAllowance;if(!a||a.maxCredits===0)return sessionPrice(q);
 return `At least ${new Intl.NumberFormat('en',{maximumSignificantDigits:3,roundingMode:'floor'}).format(a.minMicrosPer10kCredits/10000/a.chargeMicros)} generated min per credit`;
}
export type SessionConfig={owner:string;input:DJSessionInput;quote:SessionQuote};
export async function sessionAPI(path='',body?:unknown,signal?:AbortSignal,keepalive=false){
 const response=await fetch('/api/ai-dj/sessions'+path,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(10000)]):AbortSignal.timeout(10000),keepalive,headers:body===undefined?{}:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const value=await response.json();if(!response.ok)throw Error(value.error||'Session unavailable.');return value;
}
export const waitForSession=(signal:AbortSignal,ms=1000)=>new Promise<void>((resolve,reject)=>{const abort=()=>{clearTimeout(timer);reject(Error('Cancelled'));};const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},ms);if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});});
export class DJSessionClient{
 private sequence=0;private stopped=false;private started=false;private interval:ReturnType<typeof setInterval>|undefined;private ack=Promise.resolve();private acknowledged=-1;private stopTask:Promise<void>|undefined;private heartbeating=false;
 constructor(readonly config:SessionConfig,private fail:(message:string)=>void){}
 private post(action:string,body:Record<string,unknown>={},signal?:AbortSignal){return sessionAPI('/'+this.config.input.id+'/'+action,{owner:this.config.owner,...body},signal);}
 source:DJTrackSource=async(direction,signal)=>{
  if(this.stopped)return null;const sequence=this.sequence;
  if(sequence===0){
   const input={...this.config.input,energy:direction.energy,mood:direction.mood};
   if(input.energy!==this.config.input.energy||input.mood!==this.config.input.mood){
    const quote:SessionQuote=await sessionAPI('/quote',{owner:this.config.owner,input},signal);
    const before=this.config.quote;
    if(!!quote.djAllowance!==!!before.djAllowance||(quote.djAllowance?.maxCredits??quote.credits)>(before.djAllowance?.maxCredits??before.credits)||(quote.djAllowance&&before.djAllowance&&(quote.djAllowance.chargeMicros>before.djAllowance.chargeMicros||quote.djAllowance.minMicrosPer10kCredits<before.djAllowance.minMicrosPer10kCredits)))throw Error('The price increased. Check credits again before starting.');
    this.config.input=input;this.config.quote=quote;
   }
   await sessionAPI('/start',{owner:this.config.owner,input:this.config.input,token:this.config.quote.token},signal);this.started=true;
   if(this.stopped||signal.aborted){this.stopTask=undefined;void this.stop();return null;}
   this.interval=setInterval(()=>{if(this.heartbeating)return;this.heartbeating=true;void this.post('heartbeat').catch(()=>{this.fail('Connection lost. Stopping the session safely.');void this.stop();}).finally(()=>{this.heartbeating=false;});},20000);
  }else{await this.ack;const result=await this.post('next',{sequence,energy:direction.energy,vocals:direction.vocals,mood:direction.mood},signal);if(result.ending)return null;}
  while(!signal.aborted&&!this.stopped){
   const status=await sessionAPI('/'+this.config.input.id,undefined,signal),batch=status.batches.find((b:{sequence:number})=>b.sequence===sequence);
   if(batch?.state==='completed'&&batch.ready&&batch.audio_sha256){this.sequence++;return {sequence,track:{id:String(sequence),title:this.config.input.title+' · '+(sequence+1),artist:'Jamloom original',url:'/api/ai-dj/sessions/'+this.config.input.id+'/audio/'+sequence,sha256:batch.audio_sha256,energy:direction.energy,mood:direction.mood,vocal:!!batch.vocal,vocalCue:batch.vocal??undefined,credit:''}};}
   if(status.state!=='active'||batch&&['failed','cancelled'].includes(batch.state))return null;
   await waitForSession(signal);
  }return null;
 };
 observe(snapshot:DJSnapshot){
  for(const id of snapshot.history)if(Number(id)>this.acknowledged){this.acknowledged=Number(id);this.ack=this.ack.then(()=>this.post('played',{sequence:Number(id)})).then(()=>{}).catch(()=>{this.fail('Playback could not be confirmed. Stopping the session safely.');void this.stop();});}
  if(['stopped','error'].includes(snapshot.status))void this.stop();
 }
 stop(){
  if(this.stopTask)return this.stopTask;
  this.stopped=true;clearInterval(this.interval);this.interval=undefined;
  // Also covers a lost Start response; the server expires an unreachable client independently.
  return this.stopTask=(async()=>{try{await this.ack;await sessionAPI('/'+this.config.input.id+'/stop',{owner:this.config.owner},undefined,true);}catch{if(this.started)this.fail('Music stopped. Server cleanup will retry; your recording remains on this device.');}})();
 }
}
