import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
export const runtime='nodejs';
export async function GET(){
 const html=(await readFile(join(process.cwd(),'public/studio/singing.html'),'utf8')).replace('<head>','<head><base href="/studio/"><meta name="robots" content="noindex,nofollow">');
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Permissions-Policy':'microphone=(self)'}});
}
