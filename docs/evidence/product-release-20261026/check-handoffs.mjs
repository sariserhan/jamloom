// In-app browser runtime is unavailable; reuse the existing muted local test tools.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import {silenceSpeakers} from '../../../apps/site/tests/silent-audio.mjs';
const {chromium,webkit}=createRequire(new URL('../../../apps/site/package.json',import.meta.url))('playwright');
const energy=process.argv[2]==='--energy',overlap=process.argv[2]==='--overlap',mix=false;assert.ok(process.argv.length===2||(energy||overlap)&&process.argv.length===3);
const players=energy||overlap?2:4,route=overlap?'overlap':energy?'energy-entry':'handoff-revision',prefix=overlap?'overlap-':energy?'energy-':'handoff-';
const results=[];
for(const [name,engine] of Object.entries({chromium,webkit})){
 const browser=await engine.launch();
 try{
  const context=await browser.newContext();await context.addInitScript(silenceSpeakers);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const [layout,viewport] of Object.entries({desktop:{width:1440,height:1000},mobile:{width:390,height:844}})){
   await page.setViewportSize(viewport);
   const response=await page.goto(`http://localhost:8766/${route}/review/`);assert.equal(response.status(),200);
   assert.equal(await page.locator('audio').count(),players);
   assert.doesNotMatch(await page.locator('body').innerText(), /turbo|base model|64 steps|601026/i);
   assert.equal((await page.request.get(new URL('listening-key.json',page.url()).href)).status(),404);
   await page.waitForFunction(mix=>[...document.querySelectorAll('audio')].every(a=>a.duration>=25.9&&a.duration<27),mix);
   assert.ok(await page.locator('audio').evaluateAll(nodes=>nodes.every(a=>a.paused&&!a.autoplay)));
   for(let i=0;i<players;i++){
    const clip=page.locator('audio').nth(i);await clip.evaluate(a=>a.play());
    await page.waitForFunction(i=>document.querySelectorAll('audio')[i].currentTime>.1,i);
    assert.equal(await page.locator('audio').evaluateAll(nodes=>nodes.filter(a=>!a.paused).length),1);
    await clip.evaluate(a=>{a.currentTime=15;});
    await page.waitForFunction(i=>{const a=document.querySelectorAll('audio')[i];return !a.seeking&&a.currentTime>=15&&!a.error},i);
   }
   await page.locator('audio').evaluateAll(nodes=>nodes.forEach(a=>a.pause()));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:new URL(`${prefix}${name}-${layout}.png`,import.meta.url).pathname,fullPage:true});
   results.push({engine:name,layout,players,play:'PASS',seek:'PASS',one_at_a_time:'PASS',no_autoplay:'PASS'});
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
}
await writeFile(new URL(prefix+'browser.json',import.meta.url),JSON.stringify({results,output:'Muted',listening:'NOT RUN'},null,2)+'\n');
console.log(`PASS ${players} players: Chromium/WebKit, desktop/mobile, playback, seek, one at a time, no autoplay.`);
