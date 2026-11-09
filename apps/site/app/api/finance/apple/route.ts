import {syncConfiguredAppleFinance} from '../../../../lib/apple-finance-sync';
import {sendOperationAlert} from '../../../../lib/operations-monitor';
export const runtime='nodejs';export const maxDuration=180;
export async function GET(request:Request){
 const key=process.env.CRON_SECRET;if(!key||key.length<32)return new Response(null,{status:503});
 if(request.headers.get('authorization')!==`Bearer ${key}`)return new Response(null,{status:401});
 try{const {services}=await import('../../../../lib/services');return Response.json(await syncConfiguredAppleFinance(services().pool),{headers:{'Cache-Control':'no-store'}});}
 catch{await sendOperationAlert('apple-finance-read-failed').catch(()=>{});return Response.json({error:'Apple financial reporting requires attention'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
