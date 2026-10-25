import {AudioError} from './audio-validation';
import {boundedAuthRequest} from './bounded-request';
import type {DJSessions} from './dj-sessions';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
type Context={owner:string|null;origin:string;sessions:DJSessions|null;enabled:boolean};
export async function djSessionRequest(request:Request,context:()=>Promise<Context>,path:string[]=[]){
 try{
  const {owner,origin,sessions,enabled}=await context();const [id,action,sequence]=path;
  if(path.length>3||new URL(request.url).search)throw new AudioError('Invalid session request.');
  if(request.method==='GET'&&!id)return Response.json({owner,enabled:enabled&&!!sessions},{headers});
  if(!owner)throw new AudioError('Sign in to start your set.',401);
  if(!sessions)throw new AudioError('Original generation is not ready yet.',503);
  if(request.method==='GET'){
   if(id&&!action)return Response.json(await sessions.status(owner,id),{headers});
   if(action==='audio'&&sequence!==undefined&&/^(0|[1-9][0-9]{0,6})$/.test(sequence))return new Response(new Uint8Array(await sessions.audio(owner,id,Number(sequence))),{headers:{...headers,'Content-Type':'audio/wav'}});
  }
  if(request.method==='POST'){
   if(request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')==='cross-site')throw new AudioError('Request origin not allowed.',403);
   const bounded=await boundedAuthRequest(request,4096);if(!bounded)throw new AudioError('Session request too large.',413);
   let body;try{body=await bounded.json();if(!body||typeof body!=='object'||Array.isArray(body))throw Error();}catch{throw new AudioError('Invalid session request.');}
   if(body.owner!==owner)throw new AudioError('Your account changed. Sign back in.',409);
   const keys=(allowed:string[])=>{if(Object.keys(body).some(k=>!['owner',...allowed].includes(k)))throw new AudioError('Invalid session fields.');};
   if((id==='quote'||id==='start')&&!action){
    keys(id==='quote'?['input']:['input','token']);if(id==='start'&&(typeof body.token!=='string'||body.token.length>4096))throw new AudioError('Invalid quote.');if(!enabled)throw new AudioError('Original generation is not ready yet.',503);
    return Response.json(id==='quote'?await sessions.quote(owner,body.input):await sessions.start(owner,body.input,body.token),{headers});
   }
   if(!id||sequence!==undefined)throw new AudioError('Unsupported session operation.',404);
   if(action==='stop'){keys([]);await sessions.stop(owner,id);return Response.json(await sessions.status(owner,id),{headers});}
   if(action==='heartbeat'){keys([]);await sessions.heartbeat(owner,id);return Response.json({ok:true},{headers});}
   if(action==='played'){keys(['sequence']);await sessions.played(owner,id,body.sequence);return Response.json({ok:true},{headers});}
   if(action==='next'){keys(['sequence','energy']);if(!enabled){await sessions.stop(owner,id,'failure');throw new AudioError('Generation is unavailable. Your prepared music can finish.',503);}return Response.json(await sessions.next(owner,id,body.sequence,body.energy),{headers});}
  }
  throw new AudioError('Unsupported session operation.',404);
 }catch(e){return Response.json({error:e instanceof AudioError?e.message:'Session service is temporarily unavailable.'},{status:e instanceof AudioError?e.status:503,headers});}
}
