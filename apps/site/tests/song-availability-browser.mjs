import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.JAMLOOM_TEST_BASE_URL??'http://127.0.0.1:3011';
assert.equal(new URL(base).hostname,'127.0.0.1','Synthetic capability fixtures stay local');
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const results=[];
try{
 for(const state of ['closed','failed','ready']){
  const context=await browser.newContext();let writes=0;
  await context.route('**/api/**',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(request.method()!=='GET'){writes++;return route.abort();}
   if(['/api/improvise/song','/api/taste/song'].includes(url.pathname)&&!url.search){
    return route.fulfill({status:state==='failed'?503:200,contentType:'application/json',body:JSON.stringify({creditsEnabled:state!=='closed',signedIn:true,mode:'cloud'})});
   }
   return route.continue();
  });
  await context.addInitScript(()=>localStorage.setItem('jamloom-taste-v1',JSON.stringify({version:1,references:['Test artist — test song'],energy:'balanced',tempo:110,instruments:['bass','drums'],novelty:50})));
  const page=await context.newPage();await page.goto(base+'/improvise');
  await page.locator('input[type=file]').setInputFiles(new URL('../../../renders/fixtures/synthetic-speech.wav',import.meta.url).pathname);
  const improvise=page.getByRole('button',{name:'Make my song',exact:false});
  if(state==='ready'){await improvise.click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');}
  else{await page.getByText('Song creation is currently unavailable.',{exact:false}).waitFor();assert.equal(await improvise.isDisabled(),true);}
  await page.goto(base+'/music-dna');const dna=page.getByRole('button',{name:'Make my music',exact:true});
  if(state==='ready'){await dna.click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');}
  else{await page.getByText('Song creation is currently unavailable.',{exact:false}).waitFor();assert.equal(await dna.isDisabled(),true);}
  assert.equal(writes,0);results.push({state,bothProducts:'PASS',writes:0});await context.close();
 }
 console.log(JSON.stringify({status:'PASS',scope:'Synthetic availability responses only; no generation requests or owner judgments',results},null,2));
}finally{await browser.close();}
