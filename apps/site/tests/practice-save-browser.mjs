import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),saved=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 // Intercept every request. Synthetic QA answers never reach the owner server.
 await page.route('http://127.0.0.1:48888/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/api/session')return route.fulfill({json:{token:'synthetic-qa'}});
  if(path==='/api/save'){saved.push(route.request().postDataJSON());return route.fulfill({json:{saved:true,receipt:'synthetic-qa-practice.json'}});}
  const files={'/practice-observation.html':'practice-observation.html','/practice-observation.js':'practice-observation.js','/owner-review.css':'owner-review.css'};
  if(!files[path])return route.fulfill({status:404,body:''});
  await route.fulfill({contentType:path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html',body:await readFile(new URL('../../listening/'+files[path],import.meta.url),'utf8')});
 });
 await page.goto('http://127.0.0.1:48888/practice-observation.html');
 for(const phase of ['before','after']){
  await page.locator('[name=outcome]').selectOption('incomplete');await page.locator('[name=attempts]').fill('1');
  await page.locator('[name=notes]').fill('Synthetic QA only; no learner outcome.');
  await page.locator('form button').click();
  assert.equal(saved.length,0);
  if(phase==='before')await page.locator('#continue').click();
 }
 assert.match(await page.locator('#status').textContent(),/not submitted yet/);
 await page.reload();await page.getByRole('heading',{name:'Final step: describe and submit'}).waitFor();
 for(const [name,value] of Object.entries({environment:'Synthetic QA browser',clarity:'3',enjoyment:'3',problems:'Synthetic QA only'}))await page.locator(`[name=${name}]`).fill(value);
 await page.locator('[name=attested]').check();await page.getByRole('button',{name:'Save hands-on observations locally'}).click();
 await page.getByText('Saved receipt: synthetic-qa-practice.json',{exact:true}).waitFor();
 assert.equal(saved.length,1);assert.equal(saved[0].kind,'practice');assert.equal(saved[0].payload.attested,true);
 await page.reload();await page.getByRole('heading',{name:'Observations submitted'}).waitFor();
 assert.equal(saved.length,1);assert.deepEqual(errors,[]);
 await page.screenshot({path:'/tmp/jamloom-practice-save.png'});
 console.log(JSON.stringify({status:'PASS',syntheticOnly:true,ownerServerRequests:0,draftNotSubmission:true,resumesFinalStep:true,receiptPersists:true,viewport:[390,844],errors}));
}finally{await browser.close();}
