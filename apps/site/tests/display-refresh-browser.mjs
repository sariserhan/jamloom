import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
const base='http://127.0.0.1:3008',folder=new URL('../../../docs/evidence/vercel-cost-20261026/',import.meta.url),results=[];
await mkdir(folder,{recursive:true});
for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();try{
  const context=await browser.newContext();const page=await context.newPage(),counts={},errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',async route=>{
   const u=new URL(route.request().url());if(u.origin!==base)return route.abort();
   if(!u.pathname.startsWith('/api/'))return route.continue();
   const key=u.pathname+(u.searchParams.has('view')?'?view='+u.searchParams.get('view'):'');counts[key]=(counts[key]??0)+1;
   await delay(100);
   if(u.pathname==='/api/favorites'||u.pathname==='/api/creation-feedback')return route.fulfill({status:401,json:{error:'Sign in'}});
   if(u.pathname==='/api/site-status')return route.fulfill({json:{banner:'Polling test'}});
   if(u.pathname==='/api/improvise/song')return route.fulfill({json:{active:null,songs:u.searchParams.get('view')==='public'?[{id:'a'.repeat(32),title:'Fixture groove',language:'en',product:'improvise'}]:[],filters:{languages:['en'],genres:[]},next:null,feedbackAvailable:false}});
   return route.fulfill({json:{}});
  });
  await page.clock.install();await page.goto(base+'/improvise');await page.getByText('Polling test',{exact:true}).waitFor();await page.getByRole('heading',{name:'Fixture groove',exact:true}).first().waitFor();await delay(500);
  assert.equal(counts['/api/improvise/song?view=public'],1,'showcase and community share one read');const before={...counts};
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.fastForward(120000);await delay(150);assert.deepEqual(counts,before,'hidden tabs do not poll');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'));});await delay(400);
  for(const key of ['/api/site-status','/api/favorites','/api/improvise/song?view=public'])assert.equal(counts[key],before[key]+1,'single resume read '+key);
  const resumed={...counts};await page.clock.fastForward(30000);await delay(100);assert.deepEqual(counts,resumed,'no half-minute favorites poll');
  await page.clock.fastForward(30000);await delay(400);
  for(const key of ['/api/site-status','/api/favorites','/api/improvise/song?view=public'])assert.equal(counts[key],resumed[key]+1,'one minute read '+key);
  assert.equal(counts['/api/improvise/song?view=mine'],resumed['/api/improvise/song?view=mine'],'private list is not periodically polled');
  assert.deepEqual(errors,[]);await page.screenshot({path:new URL('polling-'+name+'.png',folder).pathname,fullPage:true});results.push({browser:name,sharedPublicRead:true,hiddenPollingStopped:true,focusVisibilityCoalesced:true,favoritesIntervalSeconds:60,privateListNoTimer:true,errors});
 }finally{await browser.close();}
}
await writeFile(new URL('polling-browser.json',folder),JSON.stringify({status:'PASS controlled browser requests',productionBillingSavings:'NOT MEASURED; local only',results},null,2)+'\n');console.log(JSON.stringify(results));
