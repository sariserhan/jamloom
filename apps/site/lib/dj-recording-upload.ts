export type RecordedSet={blob:Blob;receipt:{title?:string;mime:string;seconds:number;bytes:number;sha256:string}};
export type PendingSet={id:string;owner:string;title:string;mime:string;seconds:number;bytes:ArrayBuffer;sha256:string};
async function outbox<T>(mode:IDBTransactionMode,action:(store:IDBObjectStore,done:(value:T)=>void)=>void):Promise<T>{
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('jamloom-dj-save-outbox',1);r.onupgradeneeded=()=>r.result.createObjectStore('pending');r.onsuccess=()=>resolve(r.result);r.onerror=r.onblocked=()=>reject(Error('Browser recovery storage is unavailable. Download your recording before leaving.'));});
 try{return await new Promise<T>((resolve,reject)=>{let value:T;const tx=db.transaction('pending',mode);action(tx.objectStore('pending'),v=>{value=v;});tx.oncomplete=()=>resolve(value);tx.onabort=tx.onerror=()=>reject(Error('A recording is already waiting to save, or browser storage is full. Keep your download.'));});}finally{db.close();}
}
export const pendingSet=(owner:string)=>outbox<PendingSet|null>('readonly',(store,done)=>{const r=store.get('take');r.onsuccess=()=>done(r.result?.owner===owner?r.result:null);});
export async function stageSet(owner:string,take:RecordedSet){
 const {receipt}=take;if(!receipt.title||take.blob.size!==receipt.bytes||receipt.bytes>96*1024*1024)throw Error('This recording cannot be saved. Keep your download.');
 const value:PendingSet={id:crypto.randomUUID().replaceAll('-',''),owner,title:receipt.title,mime:receipt.mime,seconds:receipt.seconds,sha256:receipt.sha256,bytes:await take.blob.arrayBuffer()};
 await outbox<void>('readwrite',(store,done)=>{const r=store.get('take');r.onsuccess=()=>{if(r.result){store.transaction.abort();return;}store.put(value,'take');done();};});return value;
}
export const forgetSet=(owner:string,id:string)=>outbox<void>('readwrite',(store,done)=>{const r=store.get('take');r.onsuccess=()=>{if(r.result?.owner===owner&&r.result.id===id)store.delete('take');done();};});
export async function recordingAPI(path='',body?:unknown,signal?:AbortSignal,method=body===undefined?'GET':'POST'){
 const response=await fetch('/api/ai-dj/recordings'+path,{method,credentials:'same-origin',cache:'no-store',signal,headers:body===undefined?{}:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const value=await response.json();if(!response.ok)throw Error(value.error||'Saving is unavailable. Keep the local copy.');return value;
}
export async function uploadSet(take:PendingSet,progress:(value:string)=>void,signal:AbortSignal){
 const checksum=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',take.bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');if(checksum!==take.sha256)throw Error('The recovery copy changed. Keep your original download.');
 const {bytes,...input}=take,ready=await recordingAPI('',{...input,bytes:bytes.byteLength,consent:true},signal);
 if(!ready.ready&&!ready.finalizing){
  const size=5*1024*1024,blob=new Blob([bytes]);
  for(let at=0;at<blob.size;at+=size){
   progress(`Saving ${Math.round(at/blob.size*100)}%…`);const number=at/size+1,part=blob.slice(at,at+size),grant=await recordingAPI('/'+take.id+'/part',{number},signal);
   if(grant.bytes!==part.size||typeof grant.url!=='string'||!grant.url.startsWith('https://'))throw Error('Invalid upload grant.');
   const response=await fetch(grant.url,{method:'PUT',body:part,signal,credentials:'omit'}).catch(()=>{throw Error('Upload interrupted. Your recovery copy is kept on this device; retry saving.');});if(!response.ok)throw Error('Upload interrupted. Your recovery copy is kept on this device; retry saving.');
  }
 }
 if(!ready.ready){progress('Verifying your saved set…');await recordingAPI('/'+take.id+'/complete',{},signal);}
 await forgetSet(take.owner,take.id);
}
