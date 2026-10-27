// Real product UI with controlled media promises and contact transport; no uploads or audio playback.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const base=process.env.JAMLOOM_TEST_URL??'http://127.0.0.1:3008';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Local preview only');
const output=process.env.JAMLOOM_EVIDENCE_DIR??'/tmp/jamloom-recovery-browser',results=[];
await mkdir(output,{recursive:true});
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',route=>{
   const url=new URL(route.request().url()),song=url.pathname==='/api/taste/song'?'DNA fixture':url.pathname==='/api/improvise/song'?'Improvise fixture':null;
   return route.fulfill({status:url.pathname==='/api/favorites'?401:200,json:{songs:song?[{id:'c'.repeat(32),title:song}]:[],sets:[],tracks:[]}});
  });
  await page.addInitScript(()=>{
   window.policyViolations=[];document.addEventListener('securitypolicyviolation',e=>window.policyViolations.push(e.violatedDirective));
   localStorage.setItem('jamloom-favorites-v1',JSON.stringify(['A','B'].map((title,i)=>({id:String(i+1).repeat(32),title:'Test '+title,artist:'Jamloom',kind:'improvise',url:'/api/improvise/song?id='+String(i+1).repeat(32)+'&file=audio'}))));
   window.pendingPlay=[];
   HTMLMediaElement.prototype.play=function(){return new Promise((resolve,reject)=>window.pendingPlay.push({resolve,reject}));};
   const timeout=AbortSignal.timeout.bind(AbortSignal),fetchOriginal=window.fetch;
   window.contactCalls=0;window.contactMode='timeout';
   AbortSignal.timeout=ms=>{window.requestedTimeout=ms;return timeout(ms===15000?100:ms);};
   window.fetch=(url,options)=>{
    if(url!=='/api/contact')return fetchOriginal(url,options);
    window.contactCalls++;
    if(window.contactMode==='timeout')return new Promise((_,reject)=>options.signal?.addEventListener('abort',()=>reject(options.signal.reason),{once:true}));
    if(window.contactMode==='invalid')return Promise.resolve(new Response('<html>Bad gateway</html>',{status:502}));
    return Promise.resolve(Response.json({id:'test-reference'},{status:201}));
   };
  });
  await page.goto(base+'/community');
  await page.getByRole('status').filter({hasText:'2 songs loaded'}).waitFor();
  assert.equal(await page.locator('.discovery-grid article').count(),2,'Product-scoped IDs must not hide distinct songs or duplicate curated entries');
  await page.getByRole('button',{name:'♥ Favorites',exact:true}).click();
  await page.getByRole('button',{name:'Play Test A',exact:true}).click();
  await page.getByRole('button',{name:'Play Test B',exact:true}).click();
  await page.evaluate(()=>{window.pendingPlay[1].resolve();window.pendingPlay[0].reject(new DOMException('Superseded','AbortError'));});
  await page.waitForTimeout(100);
  const player=page.getByRole('complementary',{name:'Music player'});
  assert.equal(await player.getByRole('alert').count(),0,'Old play rejection must not mark the new track as failed');
  await page.getByRole('button',{name:'Play Test B',exact:true}).click();
  await page.evaluate(()=>window.pendingPlay[2].reject(new Error('Playback failed')));
  await player.getByRole('alert').waitFor();
  await page.locator('audio[aria-label="Catalogue player"]').evaluate(a=>a.dispatchEvent(new Event('play')));
  await player.getByRole('alert').waitFor({state:'detached'});
  await page.getByRole('button',{name:'Play Test A',exact:true}).click();
  await page.getByRole('button',{name:'Close player'}).click();
  await page.evaluate(()=>window.pendingPlay[3].reject(new Error('Closed player')));
  await page.waitForTimeout(100);assert.equal(await player.getByRole('alert').count(),0);
  await page.goto(base+'/report-bug');await page.waitForLoadState('networkidle');
  await page.getByLabel('Your name').fill('Recovery check');
  await page.getByLabel('Email for our reply').fill('recovery@example.test');
  await page.getByLabel('Subject',{exact:true}).fill('Kept draft');
  await page.getByLabel('What happened?',{exact:false}).fill('Keep this message after a connection failure.');
  await page.getByRole('button',{name:'Send bug report'}).click();
  await page.getByRole('status').filter({hasText:'not confirmed'}).waitFor({timeout:3000});
  assert.equal(await page.evaluate(()=>window.requestedTimeout),15000);
  assert.equal(await page.evaluate(()=>window.contactCalls),1,'No automatic duplicate submissions');
  assert.equal(await page.getByLabel('Subject',{exact:true}).inputValue(),'Kept draft');
  assert.ok(await page.getByRole('button',{name:'Send bug report'}).isEnabled());
  await page.evaluate(()=>window.contactMode='invalid');
  await page.getByRole('button',{name:'Send bug report'}).click();
  await page.getByRole('status').filter({hasText:'not confirmed'}).waitFor();
  await page.evaluate(()=>window.contactMode='success');
  await page.getByRole('button',{name:'Send bug report'}).click();
  await page.getByRole('status').filter({hasText:'test-reference'}).waitFor();
  assert.equal(await page.evaluate(()=>window.contactCalls),3);
  assert.deepEqual(errors,[]);
  assert.deepEqual(await page.evaluate(()=>window.policyViolations),[],'Direct bug-report page must hydrate under its actual CSP');
  assert.equal(new URL(page.url()).search,'','Draft must never appear in the URL');
  const noScripts=await browser.newPage({javaScriptEnabled:false});
  for(const route of ['/contact','/support','/report-bug']){
   await noScripts.goto(base+route);
   assert.equal(await noScripts.locator('form.admin-form').getAttribute('method'),'post');
   assert.ok(await noScripts.getByRole('button',{name:'Loading form…'}).isDisabled(),'No native submission before hydration');
   assert.ok(await noScripts.locator('noscript').isVisible());
   assert.match(await noScripts.locator('noscript').textContent(),/email support@jamloom.com/);
  }
  await noScripts.close();
  results.push({browser:name,result:'PASS',community:'same ID in different products retained; duplicate curated entries merged',playback:'superseded failure ignored; active failure visible; native Play clears error',contact:'direct navigation under CSP; no-JS submit disabled; 15-second timeout; malformed response; draft retained; manual retry; no duplicate automatic sends',limitation:'Controlled media and fetch; not audible playback or provider delivery'});
 }finally{await browser.close();}
}
await writeFile(output+'/report.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
