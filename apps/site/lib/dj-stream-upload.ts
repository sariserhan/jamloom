import {recordingAPI} from './dj-recording-upload';
import {sessionAPI,waitForSession} from './dj-session-client';
export type StreamTake={id:string;owner:string;sessionId:string;title:string;mime:string;written:number;uploaded:number;uploadedBytes:number;seconds:number;complete:boolean;interrupted:boolean;sealed:boolean};
const PART=5*1024*1024,CHUNK=2*1024*1024;
async function database(){return new Promise<IDBDatabase>((ok,no)=>{const r=indexedDB.open('jamloom-dj-stream-outbox',1);r.onupgradeneeded=()=>{r.result.createObjectStore('state');r.result.createObjectStore('chunks');};r.onsuccess=()=>ok(r.result);r.onerror=r.onblocked=()=>no(Error('Recording storage is unavailable.'));});}
async function transaction<T>(mode:IDBTransactionMode,action:(tx:IDBTransaction,done:(value:T)=>void)=>void){
 const db=await database();try{return await new Promise<T>((ok,no)=>{let value:T;const tx=db.transaction(['state','chunks'],mode);action(tx,v=>{value=v;});tx.oncomplete=()=>ok(value);tx.onerror=tx.onabort=()=>no(Error('Recording could not be stored safely. Free device storage and retry.'));});}finally{db.close();}
}
export const pendingStream=(owner:string)=>transaction<StreamTake|null>('readonly',(tx,done)=>{const r=tx.objectStore('state').get('take');r.onsuccess=()=>done(r.result?.owner===owner?r.result:null);});
function change(owner:string,id:string,update:(take:StreamTake,tx:IDBTransaction)=>StreamTake){return transaction<StreamTake>('readwrite',(tx,done)=>{const store=tx.objectStore('state'),r=store.get('take');r.onsuccess=()=>{if(r.result?.owner!==owner||r.result.id!==id){tx.abort();return;}const value=update(r.result,tx);store.put(value,'take');done(value);};});}
export async function forgetStream(owner:string,id:string){await transaction<void>('readwrite',(tx,done)=>{const s=tx.objectStore('state'),r=s.get('take');r.onsuccess=()=>{if(r.result?.owner===owner&&r.result.id===id){s.delete('take');tx.objectStore('chunks').delete(IDBKeyRange.bound([id,0],[id,Number.MAX_SAFE_INTEGER]));}done();};});}
async function partBlob(take:StreamTake,bytes:number){
 const offset=take.uploadedBytes;
 const blob=await transaction<Blob>('readonly',(tx,done)=>{const slices:Blob[]=[];const r=tx.objectStore('chunks').openCursor(IDBKeyRange.bound([take.id,offset+1],[take.id,offset+bytes+CHUNK]));r.onsuccess=()=>{const c=r.result;if(!c){done(new Blob(slices));return;}const value=c.value as {end:number;blob?:Blob;data?:ArrayBuffer},end=value.end,blob=value.blob??new Blob([value.data!]),start=end-blob.size;if(start>=offset+bytes){done(new Blob(slices));return;}slices.push(blob.slice(Math.max(0,offset-start),Math.min(blob.size,offset+bytes-start)));c.continue();};});
 if(blob.size!==bytes)throw Error('The recovery copy is incomplete. Keep this recording on the device.');return blob;
}
const digest=async(blob:Blob)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).map(v=>v.toString(16).padStart(2,'0')).join('');
export class DJStreamUpload{
 private take:StreamTake|null=null;private writes=Promise.resolve();private pumping=false;private again=false;private retryAt=0;private queued=0;private abort=new AbortController();
 constructor(private owner:string,private sessionId:string,private title:string,private progress:(message:string)=>void,private saved:()=>void){}
 async start({title,mime}:{title:string;mime:string}){
  this.title=title;
  const value:StreamTake={id:crypto.randomUUID().replaceAll('-',''),owner:this.owner,sessionId:this.sessionId,title:this.title,mime,written:0,uploaded:0,uploadedBytes:0,seconds:0,complete:false,interrupted:false,sealed:false};
  let conflict=false;try{await transaction<void>('readwrite',(tx,done)=>{const s=tx.objectStore('state'),r=s.get('take');r.onsuccess=()=>{if(r.result){conflict=true;tx.abort();return;}s.put(value,'take');done();};});}catch(error){if(conflict)throw Error('Another recording is waiting to save. Finish it in its original account before starting.');throw error;}this.take=value;
  await recordingAPI('/stream',{owner:this.owner,id:value.id,sessionId:this.sessionId,title:this.title,mime},this.signal());
 }
 private signal(){return AbortSignal.any([this.abort.signal,AbortSignal.timeout(20000)]);}
 write(blob:Blob){
  if(!this.take||blob.size>CHUNK||this.queued+blob.size>8*1024*1024)return Promise.reject(Error('Recording storage fell behind. The captured audio is kept for recovery.'));
  const id=this.take.id;this.queued+=blob.size;
  // WebKit private contexts reject IndexedDB Blob values; bounded byte buffers work in both engines.
  const pending=this.writes.then(async()=>{const data=await blob.arrayBuffer();this.take=await change(this.owner,id,(take,tx)=>{if(take.complete){tx.abort();return take;}const end=take.written+data.byteLength;tx.objectStore('chunks').put({end,data},[id,end]);return {...take,written:end};});});
  this.writes=pending.finally(()=>{this.queued-=blob.size;});void this.writes.catch(()=>{});void pending.then(()=>this.pump()).catch(()=>{});return pending;
 }
 sample(seconds:number){if(!this.take||!Number.isFinite(seconds)||seconds<=0)return Promise.resolve();const id=this.take.id;this.writes=this.writes.then(async()=>{this.take=await change(this.owner,id,t=>t.complete?t:{...t,seconds});});void this.writes.catch(()=>{});return this.writes;}
 async finish({seconds,gaps,clockStalls}:{seconds:number;gaps:number;clockStalls:number}){
  await this.writes;if(!this.take)throw Error('Recording missing');this.take=await change(this.owner,this.take.id,t=>({...t,seconds,complete:true,interrupted:!!gaps}));void this.pump();
 }
 async retry(take:StreamTake){this.take=take;this.retryAt=0;await this.pump();}
 async recover(take:StreamTake){
  if(!take.written||!take.seconds)throw Error('No recoverable audio was captured.');
  this.take=await change(this.owner,take.id,t=>({...t,complete:true,interrupted:true}));this.retryAt=0;await this.pump();
 }
 private async pump(){
  if(this.pumping){this.again=true;return;}if(!this.take||this.abort.signal.aborted||Date.now()<this.retryAt)return;this.pumping=true;
  try{
   while(!this.abort.signal.aborted){
    const take=await pendingStream(this.owner);if(!take||take.id!==this.take.id)return;this.take=take;
    const left=take.written-take.uploadedBytes;if(left<PART&&!take.complete)return;
    if(left>0){
     const bytes=Math.min(left,PART),blob=await partBlob(take,bytes),number=take.uploaded+1,sha256=await digest(blob);
     this.progress('Saving your set as it plays…');const grant=await recordingAPI('/'+take.id+'/stream-part',{number,bytes,sha256},this.signal());
     if(grant.bytes!==bytes||typeof grant.url!=='string'||!grant.url.startsWith('https://'))throw Error('Invalid recording upload grant.');
     const response=await fetch(grant.url,{method:'PUT',body:blob,credentials:'omit',signal:this.signal()});if(!response.ok)throw Error('Upload interrupted. Captured audio is kept on this device.');
     this.take=await change(this.owner,take.id,t=>({...t,uploaded:number,uploadedBytes:take.uploadedBytes+bytes}));continue;
    }
    if(!take.complete)return;
    if(!take.sealed){
     this.progress('Finishing your saved set…');let ended=false;
     for(let i=0;i<30;i++){if((await sessionAPI('/'+take.sessionId,undefined,this.abort.signal)).state==='ended'){ended=true;break;}await waitForSession(this.abort.signal,2000);}
     if(!ended)throw Error('Session cleanup is still running. Retry saving shortly.');
     await recordingAPI('/'+take.id+'/seal',{seconds:take.seconds,interrupted:take.interrupted},this.signal());this.take=await change(this.owner,take.id,t=>({...t,sealed:true}));continue;
    }
    const result=await recordingAPI('/'+take.id+'/complete-stream',{},this.signal());
    if(!result.ready){this.progress(`Checking your recording · ${result.verified} of ${result.parts} parts`);continue;}
    await forgetStream(this.owner,take.id);this.take=null;this.progress(take.interrupted?'Recovered captured audio. This interrupted set is not publicly listed.':'Your complete set is saved.');this.saved();return;
   }
  }catch(error){this.retryAt=Date.now()+10000;if(!this.abort.signal.aborted)this.progress((error instanceof Error?error.message:'Saving interrupted.')+' Your recovery copy stays on this device.');}
  finally{this.pumping=false;if(this.again){this.again=false;void this.pump();}}
 }
 dispose(){this.abort.abort();}
}
