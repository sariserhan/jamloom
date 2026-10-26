import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(new URL('../../../apps/site/package.json',import.meta.url))('playwright');
const browser=await chromium.launch(),results=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 for(const route of ['/improvise','/music-dna','/dj-studio','/pro','/live-dj','/ai-dj','/academy','/community','/studio/index.html','/studio/dj.html']){
  assert.equal((await page.goto('https://www.jamloom.com'+route)).status(),200);
  if(new URL(page.url()).pathname!==route){assert.ok(['/improvise','/music-dna','/ai-dj','/academy'].includes(route));assert.ok(['/tour','/'].includes(new URL(page.url()).pathname));results.push({route,launch_gate:'preserved'});continue;}
  await page.getByRole('button',{name:/How to use/}).click();const dialog=page.getByRole('dialog',{name:/guide/});await dialog.waitFor();assert.match(await dialog.innerText(),/How to use it/);assert.equal(await dialog.evaluate(d=>getComputedStyle(d,'::backdrop').backdropFilter),'blur(8px)');
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});results.push({route,guide:'PASS'});
 }
 await page.goto('https://www.jamloom.com/report-bug');await page.getByRole('heading',{name:'Something not working?'}).waitFor();assert.ok(await page.getByRole('link',{name:'Report a bug',exact:true}).count());
 await page.screenshot({path:new URL('production-bug-page.png',import.meta.url).pathname,fullPage:true});
 await page.goto('https://www.jamloom.com/admin/feedback');assert.match(await page.locator('body').innerText(),/sign in|access|restricted|not found/i);
 await writeFile(new URL('production-browser.json',import.meta.url),JSON.stringify({status:'PASS',results,bug_page:'PASS',admin_anonymous_access:'protected',production_writes:false},null,2)+'\n');
 console.log('PASS live guides, bug page and anonymous admin protection; no production form submitted');
}finally{await browser.close();}
