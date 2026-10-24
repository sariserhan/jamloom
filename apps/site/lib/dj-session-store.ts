import {createHash} from 'node:crypto';
import type {Readable} from 'node:stream';
import {CreateMultipartUploadCommand,UploadPartCommand,ListPartsCommand,CompleteMultipartUploadCommand,AbortMultipartUploadCommand,GetObjectCommand,HeadObjectCommand,DeleteObjectCommand,type Part} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import {recordingTitle,recordingFileStem} from '../../web/set-recording-name.js';
import {r2Client} from './audio-store';

export const DJ_PART_BYTES=5*1024*1024,DJ_MAX_PARTS=10000;
export type DJRecordingMime='audio/webm;codecs=opus'|'audio/mp4';
export function djRecordingKey(owner:string,sessionId:string,mime:DJRecordingMime){
 if(typeof owner!=='string'||!owner||owner.length>200||!/^[a-f0-9]{32}$/.test(sessionId)||!['audio/webm;codecs=opus','audio/mp4'].includes(mime))throw Error('Invalid session recording');
 return `private/${createHash('sha256').update(owner).digest('hex')}/${sessionId}/set.${mime==='audio/mp4'?'m4a':'webm'}`;
}
function validKey(key:string){if(!/^private\/[a-f0-9]{64}\/[a-f0-9]{32}\/set\.(webm|m4a)$/.test(key))throw Error('Invalid recording key');}
function validUpload(id:string){if(typeof id!=='string'||!id||id.length>2048||/[\x00-\x20\x7f]/.test(id))throw Error('Invalid multipart upload');}
export function checkedRecordingParts(parts:Part[],count:number,bytes:number){
 if(!Number.isSafeInteger(count)||count<1||count>DJ_MAX_PARTS||parts.length!==count||!Number.isSafeInteger(bytes)||bytes<1||bytes>DJ_PART_BYTES*count)throw Error('Incomplete recording');
 let total=0;
 for(const [i,p] of parts.entries()){
  if(p.PartNumber!==i+1||typeof p.ETag!=='string'||!/^"?[a-f0-9]{32}"?$/.test(p.ETag)||!Number.isSafeInteger(p.Size)||p.Size!<1||p.Size!>DJ_PART_BYTES||i<count-1&&p.Size!==DJ_PART_BYTES)throw Error('Invalid recording part');
  total+=p.Size!;
 }
 if(total!==bytes)throw Error('Recording size changed');
 return parts.map(({PartNumber,ETag})=>({PartNumber,ETag}));
}

// Server-side storage only. The session service must derive the owner key and persist upload IDs;
// this adapter does not authenticate users, reserve credits or expose an upload endpoint.
export function djSessionStore(env:Record<string,string|undefined>=process.env){
 const bucket=env.R2_AI_DJ_BUCKET;
 if(bucket!=='jamloom-ai-dj-sessions')throw Error('Dedicated AI DJ session bucket required');
 const client=r2Client(env),base=(key:string)=>{validKey(key);return {Bucket:bucket,Key:key};};
 const options=()=>({abortSignal:AbortSignal.timeout(20000)});
 return {
  async begin(key:string,mime:DJRecordingMime){
   const input=base(key);if(!['audio/webm;codecs=opus','audio/mp4'].includes(mime)||key.endsWith('.m4a')!==(mime==='audio/mp4'))throw Error('Recording format mismatch');
   const r=await client.send(new CreateMultipartUploadCommand({...input,ContentType:mime,CacheControl:'private, no-store'}),options());
   if(!r.UploadId)throw Error('Multipart upload not created');return r.UploadId;
  },
  async partURL(key:string,uploadId:string,number:number,bytes:number){
   validUpload(uploadId);if(!Number.isSafeInteger(number)||number<1||number>DJ_MAX_PARTS||!Number.isSafeInteger(bytes)||bytes<1||bytes>DJ_PART_BYTES)throw Error('Invalid part bounds');
   return getSignedUrl(client,new UploadPartCommand({...base(key),UploadId:uploadId,PartNumber:number,ContentLength:bytes}),{expiresIn:300,signableHeaders:new Set(['content-length'])});
  },
  async complete(key:string,uploadId:string,count:number,bytes:number){
   validUpload(uploadId);const input={...base(key),UploadId:uploadId},parts:Part[]=[];let marker:string|undefined;
   if(!Number.isSafeInteger(count)||count<1||count>DJ_MAX_PARTS||!Number.isSafeInteger(bytes)||bytes<1||bytes>DJ_PART_BYTES*count)throw Error('Invalid final recording bounds');
   do{
    const r=await client.send(new ListPartsCommand({...input,PartNumberMarker:marker,MaxParts:1000}),options());parts.push(...r.Parts??[]);
    if(parts.length>count)throw Error('Unexpected recording parts');
    if(!r.IsTruncated)break;
    const next=Number(r.NextPartNumberMarker);if(!Number.isSafeInteger(next)||next<=Number(marker??0)||next>DJ_MAX_PARTS)throw Error('Invalid part pagination');marker=String(next);
   }while(true);
   const completed=checkedRecordingParts(parts,count,bytes);
   await client.send(new CompleteMultipartUploadCommand({...input,MultipartUpload:{Parts:completed}}),options());
   const object=await client.send(new HeadObjectCommand(base(key)),options());if(object.ContentLength!==bytes)throw Error('Final recording size mismatch');
   return {bytes:object.ContentLength,mime:object.ContentType,etag:object.ETag,parts:count};
  },
  async abort(key:string,uploadId:string){validUpload(uploadId);await client.send(new AbortMultipartUploadCommand({...base(key),UploadId:uploadId}),options());},
  async verify(key:string,bytes:number,sha256:string,mime:DJRecordingMime){
   if(!Number.isSafeInteger(bytes)||bytes<1||bytes>96*1024*1024||!/^[a-f0-9]{64}$/.test(sha256))throw Error('Invalid recording verification');
   let object;try{object=await client.send(new GetObjectCommand(base(key)),options());}catch(error){if((error as {$metadata?:{httpStatusCode:number}}).$metadata?.httpStatusCode===404)return false;throw error;}
   const body=object.Body as Readable;let size=0,header=Buffer.alloc(0);const hash=createHash('sha256');
   try{
    if(object.ContentLength!==bytes||object.ContentType!==mime)throw Error('Recording format or length changed');
    for await(const chunk of body){const data=Buffer.from(chunk);size+=data.length;if(size>bytes)throw Error('Recording exceeded reserved bytes');hash.update(data);if(header.length<16)header=Buffer.concat([header,data.subarray(0,16-header.length)]);}
    if(size!==bytes||hash.digest('hex')!==sha256)throw Error('Recording checksum changed');
    if(mime==='audio/mp4'?header.toString('ascii',4,8)!=='ftyp':header.subarray(0,4).toString('hex')!=='1a45dfa3')throw Error('Unsupported recording container');
    return true;
   }finally{body?.destroy();}
  },
  playbackURL(key:string,download=false,title=''){const named=recordingTitle(title),extension=key.endsWith('.m4a')?'m4a':'webm';return getSignedUrl(client,new GetObjectCommand({...base(key),ResponseCacheControl:'private, no-store',ResponseContentDisposition:`${download?'attachment':'inline'}; filename="jamloom-dj-session.${extension}"${named?`; filename*=UTF-8''${encodeURIComponent(recordingFileStem(named)+'.'+extension)}`:''}`}),{expiresIn:300});},
  async remove(key:string){await client.send(new DeleteObjectCommand(base(key)),options());},
 };
}
