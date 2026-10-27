import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {recordingAsset} from '../../../../../../web/singing-recordings.js';
import {singingAccess} from '../../../../../lib/singing-access';
import {audioResponse,privateHeaders} from '../../../../../lib/audio-response';
import {AudioError} from '../../../../../lib/audio-validation';
export const runtime='nodejs';
export async function GET(request:Request,{params}:{params:Promise<{id:string;kind:string}>}){
 const {id,kind}=await params;
 try{recordingAsset(id,kind);}catch{return new Response(null,{status:404,headers:privateHeaders});}
 try{
  if(!await singingAccess(request.headers))return new Response(null,{status:403,headers:privateHeaders});
  const data=await readFile(join(process.cwd(),'private/singing-recordings',`${id}-${kind}.${kind==='lyrics'?'json':'mp3'}`));
  if(kind==='lyrics')return new Response(data.toString('utf8'),{headers:{...privateHeaders,'Content-Type':'application/json; charset=utf-8','Vary':'Cookie'}});
  const response=audioResponse(request,{data});response.headers.set('Content-Type','audio/mpeg');response.headers.set('Content-Disposition',`inline; filename="${id}-${kind}.mp3"`);response.headers.set('Vary','Cookie');return response;
 }catch(error){return new Response(null,{status:error instanceof AudioError?error.status:503,headers:privateHeaders});}
}
