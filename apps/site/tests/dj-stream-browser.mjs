// Large transport/recovery check with fake HTTP storage, not hours of real-time audio.
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {createServer} from 'node:http';import {writeFile,mkdir} from 'node:fs/promises';import {resolve} from 'node:path';import {build} from 'esbuild';import {chromium,webkit} from 'playwright';
import {createServer as httpsServer} from 'node:https';import {mkdtemp,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {execFileSync} from 'node:child_process';
const bundle=await build({stdin:{contents:"import * as tools from './lib/dj-stream-upload.ts';window.streamTools=tools;",resolveDir:process.cwd()},bundle:true,format:'esm',write:false});
const server=createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/client.js'?'text/javascript':'text/html');res.end(req.url==='/client.js'?bundle.outputFiles[0].contents:'<title>Jamloom streaming transport test</title><script type="module" src="/client.js"></script>');});
const cert=await mkdtemp(resolve(tmpdir(),'jamloom-stream-'));execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',resolve(cert,'key'),'-out',resolve(cert,'cert'),'-days','1','-subj','/CN=localhost'],{stdio:'ignore'});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const kind=process.argv.includes('--webkit')?'webkit':'chromium',browser=await ({chromium,webkit}[kind]).launch(),context=await browser.newContext({ignoreHTTPSErrors:true});let fail=true,verified=0,expected=21,interrupted=false,total=0;const grants=new Map(),uploads=new Map(),errors=[];
const storage=httpsServer({key:await readFile(resolve(cert,'key')),cert:await readFile(resolve(cert,'cert'))},async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','PUT,OPTIONS');res.setHeader('Access-Control-Allow-Headers','*');if(req.method==='OPTIONS'){res.end();return;}
 try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const bytes=Buffer.concat(chunks),key=req.url.slice(1),grant=grants.get(key);assert.equal(bytes.length,grant.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),grant.sha256);uploads.set(key,bytes.length);total+=bytes.length;res.end();}catch(error){errors.push(String(error));res.writeHead(500).end();}
});await new Promise(ok=>storage.listen(0,'127.0.0.1',ok));
try{
 await context.route('**/api/ai-dj/**',async route=>{
  const r=route.request(),path=new URL(r.url()).pathname,body=r.postData()?JSON.parse(r.postData()):null;let result={};
  if(path.includes('/sessions/'))result={state:'ended'};
  else if(path.endsWith('/stream')){assert.equal(body.title,'Large party');result={id:body.id,partBytes:5242880};}
  else if(path.endsWith('/stream-part')){assert.ok(body.bytes<=5242880);const key=path.split('/')[4]+'-'+body.number;grants.set(key,body);result={url:'https://storage.invalid/'+key,bytes:body.bytes};}
  else if(path.endsWith('/seal')){assert.equal(body.interrupted,interrupted);result={};}
  else if(path.endsWith('/complete-stream'))result={ready:++verified===expected,verified,parts:expected};
  else throw Error('Unexpected route '+path);
  await route.fulfill({json:result});
 });
 await context.route('https://storage.invalid/**',async route=>{
  if(fail){await route.abort();return;}
  await route.continue({url:'https://127.0.0.1:'+storage.address().port+new URL(route.request().url()).pathname});
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));const url='http://127.0.0.1:'+server.address().port;
 const open=async()=>{await page.goto(url);await page.waitForFunction(()=>window.streamTools);};await open();
 const staged=await page.evaluate(async()=>{
  window.saved=false;window.writer=new streamTools.DJStreamUpload('owner','a'.repeat(32),'',()=>{},()=>saved=true);await writer.start({title:'Large party',mime:'audio/webm;codecs=opus'});
  for(let i=0;i<101;i++)await writer.write(new Blob([new Uint8Array(1024*1024).fill(i)]));await writer.write(new Blob([new Uint8Array(17)]));await writer.sample(7200);await writer.finish({seconds:7200,gaps:0,clockStalls:0});
  const take=await streamTools.pendingStream('owner');if(await streamTools.pendingStream('different-owner'))throw Error('Cross-account recovery leak');writer.dispose();return {written:take.written,complete:take.complete};
 });assert.equal(staged.written,101*1024*1024+17);assert.ok(staged.complete);
 await open();fail=false;
 await page.evaluate(async()=>{window.saved=false;window.writer=new streamTools.DJStreamUpload('owner','b'.repeat(32),'',()=>{},()=>saved=true);await writer.retry(await streamTools.pendingStream('owner'));});
 assert.equal(await page.evaluate(()=>saved),true);assert.equal(await page.evaluate(()=>streamTools.pendingStream('owner')),null);assert.equal(uploads.size,21);assert.equal(total,staged.written);
 // A closed tab with no final receipt preserves its prefix and explicitly requests unlisted recovery.
 verified=0;expected=1;interrupted=true;
 await page.evaluate(async()=>{writer.dispose();window.writer=new streamTools.DJStreamUpload('owner','c'.repeat(32),'',()=>{},()=>{});await writer.start({title:'Large party',mime:'audio/webm;codecs=opus'});await writer.write(new Blob([new Uint8Array(20000)]));await writer.sample(30);writer.dispose();});
 await open();await page.evaluate(async()=>{window.saved=false;window.writer=new streamTools.DJStreamUpload('owner','d'.repeat(32),'',()=>{},()=>saved=true);await writer.recover(await streamTools.pendingStream('owner'));});assert.equal(await page.evaluate(()=>saved),true);assert.deepEqual(errors,[]);
 const folder=resolve('../../docs/evidence/ai-dj-stream-flow-20261024');await mkdir(folder,{recursive:true});await writeFile(resolve(folder,kind==='webkit'?'large-webkit.json':'large-browser.json'),JSON.stringify({status:'PASS',browser:kind,scope:'101 MiB + 17 bytes of synthetic transport data; mocked HTTP/R2; two-hour metadata, not real-time endurance',bytes:staged.written,maximum_part_bytes:5242880,parts:21,reload_recovery:true,account_isolation:true,interrupted_recovery:true,errors},null,2)+'\n');console.log('PASS: bounded parts, 101 MiB reload recovery, owner isolation and interrupted-prefix recovery');
}finally{await browser.close();await new Promise(ok=>server.close(ok));await new Promise(ok=>storage.close(ok));await rm(cert,{recursive:true,force:true});}
