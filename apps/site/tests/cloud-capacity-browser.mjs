// Rendered admission/recovery checks use provider fixtures; no cloud compute.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const base=process.env.JAMLOOM_TEST_URL??'http://127.0.0.1:4235';
assert.equal(new URL(base).hostname,'127.0.0.1');
await mkdir('/tmp/jamloom-capacity-browser',{recursive:true});
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch(name==='chromium'?{channel:'chrome'}:{});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  let ready=false,posts=0,active=null;
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  await context.route('**/api/**',route=>route.fulfill({json:{songs:[],tracks:[],next:null}}));
  await context.route(/\/api\/(taste|improvise)\/song/,route=>{
   const request=route.request(),url=new URL(request.url());
   if(request.method()!=='GET'){posts++;return route.fulfill({status:503,json:{error:'No test submission allowed'}});}
   if(url.searchParams.has('view'))return route.fulfill({json:{songs:[],next:null}});
   if(url.searchParams.has('id'))return route.fulfill({json:{id:active,state:'queued'}});
   return route.fulfill({json:{available:ready,creditsEnabled:true,signedIn:true,mode:'cloud',active}});
  });
  await context.addInitScript(()=>localStorage.setItem('jamloom-taste-v1',JSON.stringify({version:1,references:['Test favorite'],referenceMetadata:[{reference:'Test favorite',genre:'Pop',source:'itunes'}],vocalLanguage:'en',energy:'balanced',tempo:100,instruments:['piano'],novelty:50})));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/music-dna');await page.getByRole('button',{name:'Check availability',exact:true}).waitFor();
  assert.match(await page.title(),/Jamloom|Music DNA/);assert.equal(new URL(page.url()).pathname,'/music-dna');
  assert(await page.getByRole('button',{name:'Make my music',exact:true}).isDisabled());
  ready=true;await page.getByRole('button',{name:'Check availability',exact:true}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Make my music')&&!b.disabled));
  assert(await page.getByText('Test favorite',{exact:true}).count()>0);
  await page.screenshot({path:`/tmp/jamloom-capacity-browser/${name}-dna.png`});
  ready=false;await page.goto(base+'/improvise');const panel=page.locator('#improvise-create');
  await panel.getByRole('button',{name:'Check availability',exact:true}).waitFor();
  await panel.locator('input[type=file]').setInputFiles({name:'retained.wav',mimeType:'audio/wav',buffer:Buffer.alloc(44)});
  await panel.getByLabel('All styles',{exact:true}).selectOption('jazz');
  assert(await panel.getByRole('button',{name:'Make my song',exact:true}).isDisabled());
  ready=true;await panel.getByRole('button',{name:'Check availability',exact:true}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Make my song')&&!b.disabled));
  assert.equal(await panel.getByLabel('All styles',{exact:true}).inputValue(),'jazz');
  assert(await panel.getByText('retained.wav',{exact:true}).isVisible());
  await page.screenshot({path:`/tmp/jamloom-capacity-browser/${name}-improvise.png`});
  ready=false;active='a'.repeat(32);await page.reload();
  await page.locator('.generation-progress[data-state="queued"]').waitFor();
  assert.equal(posts,0);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({browser:name,status:'PASS',unavailableBeforeCreditHold:true,manualRecovery:true,favoritesPreserved:true,recordingAndStylePreserved:true,activeJobResumesWhileUnavailable:true,posts,consoleErrors:errors}));
 }finally{await browser.close();}
}
