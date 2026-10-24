import {readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {validReferenceBank} from '../../../lib/ai-dj-director';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store','Cross-Origin-Resource-Policy':'same-origin','X-Content-Type-Options':'nosniff'};
export async function GET(request:Request){
 const url=new URL(request.url);
 if(process.env.NODE_ENV!=='development'||!['localhost','127.0.0.1'].includes(url.hostname)||request.headers.get('sec-fetch-site')==='cross-site')return new Response(null,{status:404,headers});
 try{
  const folder=resolve(process.cwd(),'../../renders/ai-dj-reference');
  if((await stat(resolve(folder,'bank.json'))).size>16384)throw Error('Reference metadata too large');
  const bank:unknown=JSON.parse(await readFile(resolve(folder,'bank.json'),'utf8'));if(!validReferenceBank(bank))throw Error('Invalid reference bank');
  const id=url.searchParams.get('id');if(!id)return Response.json({tracks:bank},{headers});
  const track=bank.find(t=>t.id===id);if(!track)return new Response(null,{status:404,headers});
  const file=resolve(folder,track.id+'.mp3');if((await stat(file)).size>2*1024*1024)throw Error('Reference too large');
  const data=await readFile(file);
  if(data.length>2*1024*1024||createHash('sha256').update(data).digest('hex')!==track.sha256)throw Error('Reference changed');
  return new Response(data,{headers:{...headers,'Content-Type':'audio/mpeg','Content-Length':String(data.length)}});
 }catch{return new Response(null,{status:404,headers});}
}
