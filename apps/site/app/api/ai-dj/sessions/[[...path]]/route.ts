import {services} from '../../../../../lib/services';
import {audioStore} from '../../../../../lib/audio-store';
import {DJSessions} from '../../../../../lib/dj-sessions';
import {djSessionRequest} from '../../../../../lib/dj-sessions-http';
export const runtime='nodejs';
async function handle(request:Request,context:{params:Promise<{path?:string[]}>}){
 if(process.env.NODE_ENV!=='development')return new Response(null,{status:404,headers:{'Cache-Control':'private, no-store'}});
 return djSessionRequest(request,async()=>{
  const {auth,pool,config}=services(),account=await auth.api.getSession({headers:request.headers}),store=audioStore(config);
  const budget=process.env.JAMLOOM_AI_DJ_BUDGET?JSON.parse(process.env.JAMLOOM_AI_DJ_BUDGET):null;
  const sessions=store&&budget?new DJSessions(pool,config.secret,store,budget):null;
  return {owner:account?.user.emailVerified?account.user.id:null,origin:config.baseURL,sessions,enabled:process.env.JAMLOOM_AI_DJ_ENABLED==='true'&&!!sessions&&await sessions.available()};
 },(await context.params).path);
}
export const GET=handle;
export const POST=handle;
