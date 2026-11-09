import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import assert from 'node:assert/strict';
const run=promisify(execFile);
// Vercel CLI supplies protection bypass; no public alias or protection exception.
export async function stagingRequest(path:string,init:RequestInit={},timeoutMs=60000){
 const deployment=JSON.parse(await readFile(new URL('review-deployment-v2-url.json',import.meta.url),'utf8')).deployment.url;
 const host=new URL(deployment.startsWith('https://')?deployment:'https://'+deployment);
 assert(host.hostname.startsWith('jamloom-')&&host.hostname.endsWith('.vercel.app'));
 assert(path.startsWith('/api/')&&!path.includes('\n'));assert(timeoutMs>0);
 const dir=await mkdtemp(fileURLToPath(new URL('request-',import.meta.url)));
 try{
  const headers=new Headers(init.headers);const lines=[];for(const [key,value] of headers){assert(!/[\r\n]/.test(value));lines.push(key+': '+value);}
  await writeFile(join(dir,'headers'),lines.join('\n')+'\n',{mode:0o600});
  const args=['curl',path,'--deployment',host.hostname,'--','--silent','--show-error','--max-time',String(Math.max(1,Math.ceil(timeoutMs/1000))),'--request',init.method??'GET','--header','@'+join(dir,'headers'),'--dump-header',join(dir,'response-headers'),'--output',join(dir,'response-body'),'--write-out','%{http_code}'];
  if(init.body!==undefined){assert.equal(typeof init.body,'string');await writeFile(join(dir,'body'),String(init.body),{mode:0o600});args.push('--data-binary','@'+join(dir,'body'));}
  let output;try{output=await run('/Users/serhansari/.nvm/versions/node/v22.23.1/bin/vercel',args,{cwd:fileURLToPath(new URL('../',import.meta.url)),timeout:timeoutMs+1000,maxBuffer:1024*1024,env:{...process.env,PATH:'/opt/homebrew/opt/node@22/bin:'+process.env.PATH}});}
  catch{throw Error('Private staging request failed; no automatic request replay');}
  const status=Number(output.stdout.trim());assert(Number.isInteger(status)&&status>=200&&status<=599,'Invalid staging HTTP status');
  const blocks=(await readFile(join(dir,'response-headers'),'utf8')).trim().split(/\r?\n\r?\n/);const responseHeaders=new Headers();
  for(const line of blocks.at(-1)!.split(/\r?\n/).slice(1)){const i=line.indexOf(':');if(i>0)responseHeaders.append(line.slice(0,i),line.slice(i+1).trim());}
  const bytes=await readFile(join(dir,'response-body'));assert(bytes.length<=2*1024*1024);
  return new Response([204,205,304].includes(status)?null:new Uint8Array(bytes),{status,headers:responseHeaders});
 }finally{await rm(dir,{recursive:true,force:true});}
}
