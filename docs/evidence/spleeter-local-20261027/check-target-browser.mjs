import assert from 'node:assert/strict';
import {chromium,webkit} from '/Users/serhansari/Documents/projects/jamloom/apps/site/node_modules/playwright/index.mjs';
import {writeFile} from 'node:fs/promises';
const rows=[];
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch();try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];let mic=0;
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=()=>{window.micRequests=(window.micRequests||0)+1;throw Error('No microphone expected');};});
 await page.goto('http://127.0.0.1:8766/sung-targets/review/');
 await page.getByText('Both reviews ready. No microphone access or scoring.',{exact:true}).waitFor();
 assert.equal(await page.locator('article').count(),2);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 for(const article of await page.locator('article').all()){
  const audio=article.locator('audio');await audio.evaluate(a=>a.muted=true);
  await audio.evaluate(a=>a.play());await page.waitForFunction(()=>[...document.querySelectorAll('audio')].some(a=>!a.paused&&a.currentTime>0));
  await audio.evaluate(a=>a.pause());
  const button=article.locator('button').nth(2),at=parseFloat(await button.textContent());await button.click();
  await page.waitForTimeout(100);assert.ok(Math.abs(await audio.evaluate(a=>a.currentTime)-at)<.15);
  assert.equal(await button.getAttribute('aria-current'),'true');
  assert.ok(await article.locator('canvas').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some(v=>v>0)));
 }
 await page.locator('audio').nth(0).evaluate(a=>a.play());await page.locator('audio').nth(1).evaluate(a=>a.play());assert.equal(await page.locator('audio').first().evaluate(a=>a.paused),true);
 assert.equal(await page.evaluate(()=>window.micRequests||0),0);assert.deepEqual(errors,[]);
 await page.locator('audio').evaluateAll(as=>as.forEach(a=>a.pause()));
 await page.screenshot({path:`docs/evidence/spleeter-local-20261027/targets-${name}.png`});
 rows.push({browser:name,status:'PASS',checks:['muted playback clock','phrase seek and highlight','measured pitch canvas','phone width','exclusive playback','no microphone or score'],lyricNoteAccuracy:'NOT RUN'});
 }finally{await browser.close();}
}
await writeFile('docs/evidence/spleeter-local-20261027/targets-browser.json',JSON.stringify(rows,null,2)+'\n');console.log('PASS: both browsers');
