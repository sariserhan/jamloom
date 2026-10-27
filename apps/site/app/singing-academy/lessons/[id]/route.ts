import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {singingRecordings} from '../../../../../web/singing-recordings.js';
import {lessonById} from '../../../../../web/singing-course.js';
import {singingAccess,singingContent} from '../../../../lib/singing-access';
export const runtime='nodejs';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;const recorded=singingRecordings.some(s=>s.id===id);if(!lessonById(id)&&!recorded)return new Response('Lesson not found',{status:404});
 try{const allowed=await singingAccess(request.headers),content=singingContent(allowed);
  if(recorded?!allowed:![...content.singingLessons,...content.singingSongs].some(l=>l.id===id))return new Response(null,{status:303,headers:{Location:'/singing-academy/checkout','Cache-Control':'private, no-store','Vary':'Cookie'}});
 }catch{return new Response('Course temporarily unavailable',{status:503,headers:{'Cache-Control':'no-store'}});}
 const html=(await readFile(join(process.cwd(),'public/studio/singing.html'),'utf8')).replace('<head>','<head><base href="/studio/"><meta name="robots" content="noindex,nofollow">');
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Permissions-Policy':'microphone=(self)'}});
}
