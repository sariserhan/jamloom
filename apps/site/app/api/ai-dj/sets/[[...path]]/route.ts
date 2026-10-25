import {services} from '../../../../../lib/services';
import {DJRecordings} from '../../../../../lib/dj-recordings';
import {djSessionStore} from '../../../../../lib/dj-session-store';
import {djPublicRequest} from '../../../../../lib/dj-public-http';
export const runtime='nodejs';
export async function GET(request:Request,context:{params:Promise<{path?:string[]}>}){
 try{return await djPublicRequest(request,new DJRecordings(services().pool,djSessionStore()),(await context.params).path,process.env.CREDIT_BILLING_MODE==='live');}catch{return Response.json({error:'Sets are temporarily unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
