// Read-only public workspace verification. Never submit generation or payment requests.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const base='https://www.jamloom.com',out=new URL('../../../docs/evidence/product-entry-20261101/',import.meta.url),rows=[];
const pcm=Buffer.alloc(9644);pcm.write('RIFF');pcm.writeUInt32LE(pcm.length-8,4);pcm.write('WAVEfmt ',8);pcm.writeUInt32LE(16,16);pcm.writeUInt16LE(1,20);pcm.writeUInt16LE(1,22);pcm.writeUInt32LE(48000,24);pcm.writeUInt32LE(96000,28);pcm.writeUInt16LE(2,32);pcm.writeUInt16LE(16,34);pcm.write('data',36);pcm.writeUInt32LE(pcm.length-44,40);
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch(name==='chromium'?{channel:'chrome'}:{});
 try{
  const context=await browser.newContext({viewport:name==='chromium'?{width:1440,height:1000}:{width:390,height:844}});let mutations=0;
  await context.route('**/*',r=>{const request=r.request(),url=new URL(request.url());if(!['GET','HEAD','OPTIONS'].includes(request.method())){mutations++;return r.abort();}if(url.hostname.includes('visitorping'))return r.abort();return r.continue();});
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
  for(const [path,title] of [['/music-dna','Music DNA'],['/improvise','Improvise'],['/academy','DJ Academy'],['/singing-academy','Singing Academy']]){
   console.log(name+' opening '+path);const response=await page.goto(base+path);assert.equal(response.status(),200);assert.equal(new URL(page.url()).pathname,path);await page.getByRole('heading',{level:1,name:title,exact:true}).waitFor();await page.waitForLoadState('domcontentloaded');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:new URL('live-'+name+path.replaceAll('/','-')+'.png',out).pathname});
  }
  await page.goto(base+'/music-dna');await page.waitForLoadState('domcontentloaded');await page.getByRole('combobox',{name:'Search artists or tracks'}).fill('Release check favorite');await page.getByRole('option').filter({hasText:'Release check favorite'}).click();await page.getByRole('button',{name:'Make my music',exact:true}).click();await page.getByRole('heading',{name:'Sign in to make your song'}).waitFor();assert(await page.getByRole('button',{name:/^Generate song ·/}).isDisabled());await page.waitForLoadState('domcontentloaded');
  await page.goto(base+'/improvise');await page.waitForLoadState('domcontentloaded');await page.locator('#improvise-create input[type=file]').setInputFiles({name:'local-only-check.wav',mimeType:'audio/wav',buffer:pcm});await page.getByRole('button',{name:'Make my song',exact:true}).click();await page.getByRole('heading',{name:'Sign in to make your song'}).waitFor();assert(await page.getByRole('button',{name:/^Generate song ·/}).isDisabled());await page.waitForLoadState('domcontentloaded');assert.equal(mutations,0);assert.deepEqual(errors,[]);
  rows.push({browser:name,status:'PASS',publicProductRoutes:4,anonymousLoginAtGeneration:true,generationDisabledWithoutLogin:true,localRecordingNeverUploaded:true,mutations,pageErrors:errors});await context.close();
 }finally{await browser.close();}
}
await writeFile(new URL('live-browser.json',out),JSON.stringify({at:new Date().toISOString(),base,source:'f3fdfd63',rows},null,2)+'\n');console.log(JSON.stringify(rows));
