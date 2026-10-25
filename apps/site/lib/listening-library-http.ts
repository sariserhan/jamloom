import 'server-only';
import {services} from './services';
import {listeningLibrary} from './listening-library.server';
import {musicReference} from './listening-library';
import {AudioError} from './audio-validation';
import {boundedAuthRequest} from './bounded-request';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
export async function listeningLibraryRequest(request:Request,path:string[]=[],favorites=false){try{
 const {auth,config}=services();if(request.method!=='GET'&&request.headers.get('origin')!==config.baseURL)throw new AudioError('Request origin not allowed.',403);
 const session=await auth.api.getSession({headers:request.headers});if(!session?.user.emailVerified)throw new AudioError('Sign in required.',401);
 const owner=session.user.id,library=listeningLibrary();if(path.length>(favorites?0:2)||new URL(request.url).search)throw new AudioError('Invalid collection request.');
 if(request.method==='GET'&&path.length>1)throw new AudioError('Not found.',404);
 if(!favorites&&!path[0]&&request.method==='DELETE')throw new AudioError('Choose a playlist.');
 if(request.method==='GET')return Response.json(favorites?{owner,...await library.favorites(owner)}:path[0]?await library.playlist(owner,path[0]):await library.playlists(owner),{headers});
 if(!['POST','DELETE'].includes(request.method))throw new AudioError('Unsupported operation.',405);
 const bounded=await boundedAuthRequest(request);if(!bounded)throw new AudioError('Request too large.',413);
 let value:any;try{value=await bounded.json();if(!value||typeof value!=='object'||Array.isArray(value))throw Error();}catch{throw new AudioError('Invalid request.');}
 if(value.owner!==undefined&&value.owner!==owner)throw new AudioError('Account changed. Reload your favorites.',409);
 const ref=favorites?musicReference(value):path[1]?musicReference({kind:'catalogue',id:path[1]}):value.track?musicReference(value.track):null;
 const result=await library.change(owner,favorites?null:path[0]??null,ref,request.method==='DELETE',!favorites&&!path[0]?value.title:undefined);return Response.json(result,{headers});
 }catch(e){return Response.json({error:e instanceof AudioError?e.message:'Your music could not sync. Try again.'},{status:e instanceof AudioError?e.status:503,headers});}}
