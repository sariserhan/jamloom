// A single local draft preserves an explicitly selected recording through sign-in.
// It is never uploaded here, expires after a day, and is removed when restored.
export type ImproviseDraft={file:Blob;name:string;genre:string;voice:string;visibility:'public'|'private';savedAt:number};
async function database(){return new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('jamloom-improvise-draft',1);r.onupgradeneeded=()=>r.result.createObjectStore('draft');r.onsuccess=()=>resolve(r.result);r.onerror=r.onblocked=()=>reject(Error('Could not keep your recording on this device.'));});}
export async function saveImproviseDraft(draft:ImproviseDraft){
 if(draft.file.size>100*1024*1024)throw Error('Choose a recording smaller than 100 MB.');
 const {file,...metadata}=draft,value={...metadata,mime:file.type,bytes:await file.arrayBuffer()};
 const db=await database();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('draft','readwrite');tx.objectStore('draft').put(value,'current');tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(Error('Could not keep your recording on this device.'));});}finally{db.close();}
}
export async function takeImproviseDraft():Promise<ImproviseDraft|null>{
 const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('draft','readwrite'),store=tx.objectStore('draft'),r=store.get('current');let value:ImproviseDraft|null=null;r.onsuccess=()=>{const d=r.result;if(d?.bytes instanceof ArrayBuffer&&d.bytes.byteLength<=100*1024*1024&&Number.isFinite(d.savedAt)&&Date.now()-d.savedAt<86400000&&d.savedAt<=Date.now())value={file:new Blob([d.bytes],{type:typeof d.mime==='string'?d.mime:'audio/wav'}),name:d.name,genre:d.genre,voice:d.voice,visibility:d.visibility,savedAt:d.savedAt};store.delete('current');};tx.oncomplete=()=>resolve(value);tx.onerror=tx.onabort=()=>reject(Error('Could not restore your recording.'));});}finally{db.close();}
}
