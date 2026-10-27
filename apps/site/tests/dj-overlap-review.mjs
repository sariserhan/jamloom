import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';import {silenceSpeakers} from './silent-audio.mjs';
const base='http://127.0.0.1:8766/overlap-options/review/',results=[];
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch(name==='chromium'?{args:['--mute-audio']}:{});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});await page.addInitScript(silenceSpeakers);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  assert.equal((await page.goto(base)).status(),200);assert.equal(await page.locator('audio').count(),6);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  for(let i=0;i<6;i++){
   const audio=page.locator('audio').nth(i);await audio.evaluate(a=>a.play());await page.waitForFunction(i=>document.querySelectorAll('audio')[i].currentTime>.1,i);
   assert.equal(await audio.evaluate(a=>a.duration),16);await audio.evaluate(a=>{a.currentTime=8;});await page.waitForFunction(i=>document.querySelectorAll('audio')[i].currentTime>8,i);
   assert.equal(await page.locator('audio').evaluateAll(all=>all.filter(a=>!a.paused).length),1);
  }
  await page.locator('audio').evaluateAll(all=>all.forEach(a=>a.pause()));assert.deepEqual(errors,[]);results.push({browser:name,players:6,playSeekExclusive:'PASS',mobileOverflow:false,physicalListening:'NOT RUN'});
 }finally{await browser.close();}
}
await writeFile('../../docs/evidence/web-followup-20261027/dj-overlap-review.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
