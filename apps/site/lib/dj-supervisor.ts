import type {Pool} from 'pg';
const headers={'Cache-Control':'private, no-store'};
type Context={pool:Pool;databaseURL:string;sweep:()=>Promise<{status:string}[]>};
// An independent cleanup path for registered rentals; never creates or renews capacity.
export async function djSupervisor(request:Request,getContext:()=>Context,env:Record<string,string|undefined>=process.env){
 if(request.method!=='GET')return new Response(null,{status:405,headers});
 if(!env.CRON_SECRET||env.CRON_SECRET.length<32)return new Response(null,{status:503,headers});
 if(request.headers.get('authorization')!==`Bearer ${env.CRON_SECRET}`)return new Response(null,{status:401,headers});
 if(env.JAMLOOM_DJ_SUPERVISOR_ENABLED!=='true'||!env.JAMLOOM_WATCHDOG_TARGET||(env.VERCEL&&env.VERCEL_ENV!=='production'))return new Response(null,{status:503,headers});
 try{
  const {pool,databaseURL,sweep}=getContext(),url=new URL(databaseURL);
  if(env.JAMLOOM_WATCHDOG_TARGET!==url.host+url.pathname)return new Response(null,{status:503,headers});
  const lock=await pool.connect();
  try{
   await lock.query('BEGIN');
   if(!(await lock.query("SELECT pg_try_advisory_xact_lock(hashtextextended('jamloom-dj-supervisor',0)) AS locked")).rows[0].locked)return Response.json({status:'Already running'},{headers});
   const results=await sweep();
   const pending=results.some(r=>r.status==='identity_conflict'||r.status==='destroy_requested');
   return Response.json({status:pending?'Cleanup pending':'Reconciled',checked:results.length},{status:pending?503:200,headers});
  }finally{try{await lock.query('ROLLBACK');}finally{lock.release();}}
 }catch{return Response.json({error:'DJ supervision needs retry'},{status:503,headers});}
}
