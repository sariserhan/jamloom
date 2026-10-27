import {services} from '../../../lib/services';
import {CreationFeedback,creationReference} from '../../../lib/creation-feedback';
import {AudioError} from '../../../lib/audio-validation';
import {boundedAuthRequest} from '../../../lib/bounded-request';
export const runtime='nodejs';export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
async function handle(request:Request){try{
 const {auth,pool,config}=services();if(request.method!=='GET'&&(request.headers.get('origin')!==config.baseURL||request.headers.get('sec-fetch-site')==='cross-site'))throw new AudioError('Same-origin request required.',403);
 const session=await auth.api.getSession({headers:request.headers});if(!session?.user.emailVerified)throw new AudioError('Sign in to rate music.',401);
 const owner=session.user.id,store=new CreationFeedback(pool,process.env.CREDIT_BILLING_MODE==='live'),q=new URL(request.url).searchParams;
 if(request.method==='GET'&&q.size===1&&q.get('view')==='preferences')return Response.json({owner,ratings:await store.preferences(owner)},{headers});
 if([...q.keys()].some(k=>!['kind','id'].includes(k)||q.getAll(k).length!==1))throw new AudioError('Invalid feedback request.');
 let input;
 if(request.method!=='GET'){
  const bounded=await boundedAuthRequest(request,4096);if(!bounded)throw new AudioError('Feedback is too large.',413);
  try{input=await bounded.json();}catch{throw new AudioError('Invalid feedback.');}
  if(input?.owner!==owner)throw new AudioError('Your account changed. Reload feedback.',409);
 }
 if(request.method==='DELETE'&&!q.has('kind')&&!q.has('id'))return Response.json(await store.remove(owner),{headers});
 const {kind,id}=creationReference(q.get('kind'),q.get('id'));
 if(request.method==='GET')return Response.json({owner,...await store.read(owner,kind,id)},{headers});
 if(request.method==='DELETE')return Response.json(await store.remove(owner,kind,id),{headers});
 return Response.json({owner,...await store.save(owner,kind,id,input)},{headers});
 }catch(e){return Response.json({error:e instanceof AudioError?e.message:'Feedback is temporarily unavailable. Your music is unchanged.'},{status:e instanceof AudioError?e.status:503,headers});}}
export const GET=handle;export const POST=handle;export const DELETE=handle;
