import {AudioError} from './audio-validation';
import {boundedAuthRequest} from './bounded-request';
import type {DJRecordings} from './dj-recordings';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
type Context={owner:string|null;origin:string;recordings:DJRecordings};
export async function djRecordingRequest(request:Request,context:()=>Promise<Context>,path:string[]=[]){
 try{
  const {owner,origin,recordings}=await context();if(!owner)throw new AudioError('Sign in to save and listen to your sets.',401);
  if(request.method!=='GET'&&(request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')==='cross-site'))throw new AudioError('Request origin not allowed.',403);
  const [id,action]=path;if(path.length>2)throw new AudioError('Not found.',404);
  const url=new URL(request.url);if([...url.searchParams.keys()].some(k=>k!=='download')||url.searchParams.has('download')&&(action!=='audio'||url.searchParams.get('download')!=='1'))throw new AudioError('Invalid recording query.');
  if(request.method==='GET'){
   if(!id)return Response.json({owner,recordings:await recordings.list(owner)},{headers});
   if(action==='audio')return new Response(null,{status:307,headers:{...headers,Location:await recordings.playback(owner,id,url.searchParams.has('download'))}});
  }
  if(request.method==='POST'||request.method==='DELETE'){
   const bounded=await boundedAuthRequest(request);if(!bounded)throw new AudioError('Save request too large.',413);
   let body;try{body=await bounded.json();if(!body||typeof body!=='object'||Array.isArray(body))throw Error();}catch{throw new AudioError('Invalid recording request.');}
   if(request.method==='DELETE'){
    if(Object.keys(body).join(',')!=='owner')throw new AudioError('Invalid recording request.');
    if(body.owner!==owner)throw new AudioError('Your account changed. Sign back into the recording’s account.',409);
    if(id&&!action)return Response.json(await recordings.remove(owner,id),{headers});
    throw new AudioError('Unsupported recording operation.',404);
   }
   if(!id){if(body.owner!==owner)throw new AudioError('Your account changed. Sign back into the recording’s account.',409);return Response.json(await recordings.reserve(owner,body),{headers});}
   if(action==='part'&&Object.keys(body).join(',')==='number')return Response.json(await recordings.part(owner,id,body.number),{headers});
   if(action==='complete'&&Object.keys(body).length===0)return Response.json(await recordings.complete(owner,id),{headers});
  }
  throw new AudioError('Unsupported recording operation.',404);
 }catch(error){return Response.json({error:error instanceof AudioError?error.message:'Your set has not been confirmed saved. Keep the local copy and retry.'},{status:error instanceof AudioError?error.status:503,headers});}
}
