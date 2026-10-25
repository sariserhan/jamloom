import {djBetaAllowed} from '../../../../../lib/dj-beta-access';
import {services} from '../../../../../lib/services';
import {DJRecordings} from '../../../../../lib/dj-recordings';
import {djSessionStore} from '../../../../../lib/dj-session-store';
import {djRecordingRequest} from '../../../../../lib/dj-recordings-http';
export const runtime='nodejs';
export const maxDuration=60;
let recordings:DJRecordings|undefined;
async function handle(request:Request,context:{params:Promise<{path?:string[]}>}){
 if(process.env.NODE_ENV!=='development'&&process.env.JAMLOOM_AI_DJ_BETA_ENABLED!=='true')return new Response(null,{status:404,headers:{'Cache-Control':'private, no-store'}});
 const {auth,pool,config}=services(),session=await auth.api.getSession({headers:request.headers});
 if(!djBetaAllowed(session?.user))return new Response(null,{status:404,headers:{'Cache-Control':'private, no-store'}});
 return djRecordingRequest(request,async()=>{
  recordings??=new DJRecordings(pool,djSessionStore());
  return {owner:session?.user.emailVerified?session.user.id:null,origin:config.baseURL,recordings};
 },(await context.params).path);
}
export const GET=handle;
export const POST=handle;
export const DELETE=handle;
