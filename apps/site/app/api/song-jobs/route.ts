import {stopExpiredActiveCapacity} from '../../../lib/cloud-capacity-shutdown';
import {hostedSongs} from '../../../lib/cloud-songs.server';
export const runtime='nodejs';export const maxDuration=180;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret||secret.length<32)return new Response(null,{status:503});
 if(request.headers.get('authorization')!==`Bearer ${secret}`)return new Response(null,{status:401});
 // Retain the review allowance configuration after disabling new work, until
 // outstanding test jobs are cancelled/settled and their temporary data is gone.
 try{const capacity=await stopExpiredActiveCapacity();const result=await Promise.all((['music-dna','improvise'] as const).flatMap(product=>[hostedSongs(product)?.sweep(),hostedSongs(product,true)?.sweep()]));return Response.json({capacity,result});}
 catch{return Response.json({error:'Song recovery pending'},{status:503});}
}
