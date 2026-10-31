import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';

// Synthetic UI fixture only. Never visit or write the owner's results directory.
const root=resolve('../..'),out=resolve(root,'docs/evidence/nondeployment-completion-20261030');
await mkdir(out,{recursive:true});const saves=[];
const study={version:2,review_schema:'neural-five-v1',freeze:'isolated-browser-qa',blocks:[{id:'qa-only',source_id:'qa',kind:'speech',folder:'block-001',source_sha256:'qa',audio_sha256:{A:'a',B:'b',C:'c',D:'d',E:'e'}}]};
const wav=Buffer.alloc(44+16000*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
for(let i=0;i<16000;i++)wav.writeInt16LE(Math.round(2000*Math.sin(2*Math.PI*220*i/16000)),44+i*2);
const server=createServer(async(req,res)=>{
 try{
  if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return;}
  if(req.url==='/api/session'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({token:'isolated-qa-token'}));return;}
  if(req.url==='/api/save'){
   const chunks=[];for await(const c of req)chunks.push(c);saves.push(JSON.parse(Buffer.concat(chunks).toString()));
   res.setHeader('Content-Type','application/json');res.end(JSON.stringify({receipt:'isolated-qa-'+saves.length}));return;
  }
  if(req.url==='/study.json'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(study));return;}
  if(/^\/block-001\/(source|[A-E])\.wav$/.test(req.url)){res.setHeader('Content-Type','audio/wav');res.end(wav);return;}
  const files={'/':'strategy-review.html','/strategy-review.js':'strategy-review.js','/owner-review.css':'owner-review.css'};
  if(!files[req.url]){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',req.url.endsWith('.js')?'text/javascript':req.url.endsWith('.css')?'text/css':'text/html');res.end(await readFile(resolve(root,'apps/listening',files[req.url])));
 }catch{res.writeHead(500);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome',headless:true});const checks=[];
try{
 for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(origin);await page.getByText('Study ready. Ratings start blank.').waitFor();assert.equal(await page.locator('audio').count(),6);
  await page.getByLabel('E: Natural phrasing and cuts',{exact:true}).selectOption('2');await page.getByRole('button',{name:'Save ratings to this Mac'}).click();
  await page.getByText(/Draft saved to this Mac/).waitFor();assert.equal(saves.at(-1).kind,'music-draft');
  await page.reload();await page.getByText(/Your browser draft is restored/).waitFor();assert.equal(await page.getByLabel('E: Natural phrasing and cuts',{exact:true}).inputValue(),'2');
  const selectors=page.locator('#block select');
  for(let i=0;i<await selectors.count();i++)await selectors.nth(i).selectOption({index:1});
  await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Save ratings to this Mac'}).click();await page.getByText(/Saved 1 completed blocks locally/).waitFor();
  assert.equal(saves.at(-1).kind,'music');assert(saves.at(-1).payload.ratings['qa-only'].E);assert.equal(Object.keys(saves.at(-1).payload.ratings['qa-only'].pairs).length,10);
  await page.locator('audio').nth(5).evaluate(async a=>{a.muted=true;await a.play();a.pause();});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  await page.screenshot({path:resolve(out,`neural-review-${width}.png`),fullPage:false});checks.push({width,players:6,pairs:10,draftRestored:true,partialSave:true,completeSave:true,errors});await context.close();
 }
 await writeFile(resolve(out,'neural-review-browser.json'),JSON.stringify({status:'PASS',browser:'Isolated Chromium; browser connection tool unavailable',syntheticFixture:true,ownerJudgmentsCreated:0,checks},null,2)+'\n');
 console.log('PASS isolated five-candidate review, draft recovery and complete save at 1280/390; zero owner judgments');
}finally{await browser.close();await new Promise(r=>server.close(r));}
