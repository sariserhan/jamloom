import {accountsConfigured,services} from '../../../../lib/services';
import {privateHeaders} from '../../../../lib/audio-response';
export const runtime='nodejs';
export const dynamic='force-dynamic';
// The signed-in owner's songs in progress, plus ones that finished in the last two hours,
// so the site-wide progress bar can follow them on any page. Ids and states only.
export async function GET(request:Request){
 const headers={...privateHeaders,Vary:'Cookie'};
 if(!accountsConfigured())return Response.json({songs:[]},{headers});
 const {auth,pool}=services();
 const session=await auth.api.getSession({headers:request.headers});
 if(!session?.user.emailVerified)return Response.json({songs:[]},{status:401,headers});
 const songs=(await pool.query(`SELECT d.id,d.product,d.state,d.title,
   CASE WHEN d.state IN ('queued','running') AND c.submitted_at IS NULL THEN 'starting' ELSE c.phase END AS phase
  FROM dna_song_jobs d LEFT JOIN cloud_song_runs c ON c.id=d.id
  WHERE d.owner_id=$1 AND (d.state IN ('queued','running') OR d.created_at>now()-interval '2 hours')
  ORDER BY d.created_at DESC LIMIT 5`,[session.user.id])).rows;
 return Response.json({songs},{headers});
}
