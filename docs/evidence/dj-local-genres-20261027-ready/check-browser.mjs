import assert from 'node:assert/strict';
import {chromium,webkit} from '/Users/serhansari/Documents/projects/jamloom/apps/site/node_modules/playwright/index.mjs';
import {writeFile} from 'node:fs/promises';
const rows=[];
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch();try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8766/local-dj/review/');
 assert.equal(await page.locator('audio').count(),5);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 for(const [i,audio] of (await page.locator('audio').all()).entries()){
  await audio.evaluate(async a=>{a.muted=true;await a.play();});
  await page.waitForFunction(()=>[...document.querySelectorAll('audio')].some(a=>!a.paused&&a.currentTime>0));
  assert.equal(await page.locator('audio').evaluateAll(as=>as.filter(a=>!a.paused).length),1);
  await audio.evaluate(a=>a.currentTime=30);await page.waitForTimeout(150);
  assert.ok(await audio.evaluate(a=>a.currentTime>=30));
  const duration=await audio.evaluate(a=>a.duration);assert.ok(i?Math.abs(duration-60)<.2:duration>165&&duration<168);
 }
 await page.locator('audio').evaluateAll(as=>as.forEach(a=>a.pause()));await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`docs/evidence/dj-local-genres-20261027-ready/${name}-mobile.png`});
 await page.setViewportSize({width:1440,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:`docs/evidence/dj-local-genres-20261027-ready/${name}-desktop.png`});assert.deepEqual(errors,[]);
 rows.push({browser:name,status:'PASS',players:5,checks:['muted actual playback clock','seek','durations','exclusive playback','mobile/desktop width'],humanQuality:'NOT RUN'});
 }finally{await browser.close();}
}
await writeFile('docs/evidence/dj-local-genres-20261027-ready/browser.json',JSON.stringify(rows,null,2)+'\n');console.log('PASS: five players, both browsers');
