import {stopExpiredActiveCapacity} from '../../../lib/cloud-capacity-shutdown';
import {hostedSongs,reconcileSongCapacity} from '../../../lib/cloud-songs.server';
import {capacityFailureDiagnostic} from '../../../lib/cloud-capacity';
export const runtime='nodejs';export const maxDuration=180;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret||secret.length<32)return new Response(null,{status:503});
 if(request.headers.get('authorization')!==`Bearer ${secret}`)return new Response(null,{status:401});
 // Retain the review allowance configuration after disabling new work, until
 // outstanding test jobs are cancelled/settled and their temporary data is gone.
 let stage='expired-lease';
 try{const capacity=await stopExpiredActiveCapacity();stage='guardian';const demandCapacity=await reconcileSongCapacity();stage='song-sweep';const result=await Promise.all((['music-dna','improvise'] as const).flatMap(product=>[hostedSongs(product)?.sweep(),hostedSongs(product,true)?.sweep()]));return Response.json({capacity,demandCapacity,result});}
 catch(error){
  // Sanitized: never log raw provider/database messages.
  console.error(JSON.stringify({event:'song-jobs-failed',stage,...capacityFailureDiagnostic(error),name:error instanceof Error?error.constructor.name:typeof error}));
  return Response.json({error:'Song recovery pending'},{status:503});}
}
