import {AudioError} from './audio-validation';
import type {DJRecordings} from './dj-recordings';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
export async function djPublicRequest(request:Request,recordings:DJRecordings,path:string[]=[],live=false){
 try{
  const query=new URL(request.url).searchParams;if(request.method!=='GET'||path.length>2||[...query.keys()].some(k=>k!=='after')||path.length&&query.size)throw new AudioError('Invalid set request.');
  if(path.length===0)return Response.json(await recordings.publicList(query.get('after')??'',live),{headers});
  if(path.length===2&&path[1]==='audio')return new Response(null,{status:307,headers:{...headers,Location:await recordings.publicPlayback(path[0],live)}});
  throw new AudioError('Set not found.',404);
 }catch(e){return Response.json({error:e instanceof AudioError?e.message:'Sets are temporarily unavailable.'},{status:e instanceof AudioError?e.status:503,headers});}
}
