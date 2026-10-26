import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {lessonById} from '../../../../../web/singing-course.js';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!lessonById(id))return new Response('Lesson not found',{status:404});
 const html=(await readFile(join(process.cwd(),'public/studio/singing.html'),'utf8')).replace('<head>','<head><base href="/studio/"><meta name="robots" content="noindex,nofollow">');
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Permissions-Policy':'microphone=(self)'}});
}
