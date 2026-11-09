import {services} from '../../../lib/services';
import {runOperations} from '../../../lib/operations-monitor';
export const runtime='nodejs';export const maxDuration=180;
export async function GET(request:Request){
 const key=process.env.CRON_SECRET;if(!key||key.length<32)return new Response(null,{status:503});
 if(request.headers.get('authorization')!==`Bearer ${key}`)return new Response(null,{status:401});
 try{return Response.json(await runOperations(services().pool));}
 catch{return Response.json({error:'Operating monitor or alert delivery failed'},{status:503});}
}
