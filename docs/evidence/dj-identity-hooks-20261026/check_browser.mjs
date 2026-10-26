// In-app browser runtime is unavailable; reuse the existing muted local test tools.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import {silenceSpeakers} from '../../../apps/site/tests/silent-audio.mjs';
const {chromium,webkit}=createRequire(new URL('../../../apps/site/package.json',import.meta.url))('playwright');
const results=[];
for(const [name,engine] of Object.entries({chromium,webkit})){
 const browser=await engine.launch();
 try{
  const context=await browser.newContext();await context.addInitScript(silenceSpeakers);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const [layout,viewport] of Object.entries({desktop:{width:1440,height:1000},mobile:{width:390,height:844}})){
   await page.setViewportSize(viewport);
   const response=await page.goto('http://localhost:8766/identity-hooks/review/');assert.equal(response.status(),200);
   assert.equal(await page.locator('audio').count(),2);
   await page.waitForFunction(()=>[...document.querySelectorAll('audio')].every(a=>a.duration===10));
   assert.ok(await page.locator('audio').evaluateAll(nodes=>nodes.every(a=>a.paused&&!a.autoplay)));
   for(let i=0;i<2;i++){
    const clip=page.locator('audio').nth(i);await clip.evaluate(a=>a.play());
    await page.waitForFunction(i=>document.querySelectorAll('audio')[i].currentTime>.1,i);
    assert.equal(await page.locator('audio').evaluateAll(nodes=>nodes.filter(a=>!a.paused).length),1);
    await clip.evaluate(a=>{a.currentTime=5;});
    await page.waitForFunction(i=>{const a=document.querySelectorAll('audio')[i];return !a.seeking&&a.currentTime>=5&&!a.error},i);
   }
   await page.locator('audio').evaluateAll(nodes=>nodes.forEach(a=>a.pause()));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:new URL(`${name}-${layout}.png`,import.meta.url).pathname,fullPage:true});
   results.push({engine:name,layout,players:2,play:'PASS',seek:'PASS',one_at_a_time:'PASS',no_autoplay:'PASS'});
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
}
await writeFile(new URL('browser.json',import.meta.url),JSON.stringify({results,output:'Muted',listening:'NOT RUN'},null,2)+'\n');
console.log('PASS two players: Chromium/WebKit, desktop/mobile, playback, seek, one at a time, no autoplay.');
