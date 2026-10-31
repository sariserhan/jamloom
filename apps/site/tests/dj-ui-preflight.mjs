// Check the actual setup/deck before renting; fixture requests never reach billing or generation.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {silenceSpeakers} from './silent-audio.mjs';
export async function djUIPreflight(origin){
 assert.ok(['http://localhost:3000','http://localhost:3008','http://localhost:3009'].includes(origin),'Qualification needs an approved loopback preview');
 const browser=await chromium.launch({channel:'chrome'});
 try{
  const page=await browser.newPage(),requests=[],errors=[];await page.addInitScript(silenceSpeakers);page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',async route=>{
   const r=route.request(),path=new URL(r.url()).pathname;requests.push({path,method:r.method()});
   const body=path==='/api/ai-dj/sessions'&&r.method()==='GET'?{owner:'preflight-only',enabled:true}:path==='/api/ai-dj/sessions/quote'&&r.method()==='POST'?{token:'preflight-only',credits:1,privacyCredits:0,expiresAt:Date.now()+60000}:null;
   await route.fulfill({status:body?200:503,contentType:'application/json',body:JSON.stringify(body??{error:'Preflight blocks backend operations'})});
  });
  const response=await page.goto(origin+'/ai-dj/session');assert.equal(response.status(),200,'AI DJ setup must be available before spending; production preview intentionally hides this development route');
  assert.equal(new URL(page.url()).pathname,'/ai-dj/session','Preview redirected away from DJ setup; check local coming-soon configuration');
  await page.getByLabel('Party or venue name',{exact:true}).fill('Local preflight');
  await page.getByRole('button',{name:'Check credits →'}).click();await page.getByRole('button',{name:'Continue to the deck →'}).click();
  await page.getByRole('button',{name:'Start set'}).waitFor();assert.deepEqual(errors,[]);
  assert(!requests.some(r=>r.path.endsWith('/start')),'Preflight must not start a session');
  return {status:'PASS',origin,setupAndDeck:true,realBilling:false,generation:false,requests};
 }finally{await browser.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(await djUIPreflight(process.argv[2]??process.env.JAMLOOM_QUALIFICATION_ORIGIN??'http://localhost:3009')));
