import {singingAccess,singingContent} from '../../../lib/singing-access';
export const runtime='nodejs';
export async function GET(request:Request){
 try{const content=singingContent(await singingAccess(request.headers));
  return new Response(Object.entries(content).map(([key,value])=>`export const ${key}=${JSON.stringify(value)};`).join('\n'),{headers:{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});
 }catch{return new Response('Course temporarily unavailable',{status:503,headers:{'Cache-Control':'no-store'}});}
}
