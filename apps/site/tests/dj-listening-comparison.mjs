// Browser plugin's Node REPL runtime is unavailable; use the previously authorized muted Playwright fallback.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {silenceSpeakers} from './silent-audio.mjs';
const folder='../../docs/evidence/dj-audible-comparison-20261025',results=[];
await mkdir(folder,{recursive:true});
for(const [name,engine] of Object.entries({chromium,webkit})){
 const browser=await engine.launch();
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addInitScript(silenceSpeakers);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8766/audible-comparison/review/');assert.equal(await page.locator('audio').count(),4);
  await page.waitForFunction(()=>[...document.querySelectorAll('audio')].every(a=>Number.isFinite(a.duration)&&a.duration>50));
  assert.ok(await page.locator('audio').evaluateAll(nodes=>nodes.every(a=>a.paused&&!a.autoplay)));
  const clips=[];
  for(let i=0;i<4;i++){
   const clip=page.locator('audio').nth(i);
   await clip.evaluate(async a=>{await a.play();});
   await page.waitForFunction(i=>document.querySelectorAll('audio')[i].currentTime>.15,i);
   assert.equal(await page.locator('audio').evaluateAll(nodes=>nodes.filter(a=>!a.paused).length),1);
   await clip.evaluate(a=>{a.currentTime=30;});
   await page.waitForFunction(i=>{const a=document.querySelectorAll('audio')[i];return !a.seeking&&a.currentTime>=30},i);
   clips.push(await clip.evaluate(a=>({label:a.getAttribute('aria-label'),seconds:a.duration,error:a.error?.code??null})));
  }
  await page.locator('audio').evaluateAll(nodes=>nodes.forEach(a=>a.pause()));
  await page.screenshot({path:folder+'/'+name+'-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:folder+'/'+name+'-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);assert.ok(clips.every(c=>c.error===null));results.push({engine:name,status:'PASS',clips,errors});
 }finally{await browser.close();}
}
await writeFile(folder+'/browser.json',JSON.stringify({results,speakerOutput:'Muted',humanListening:'NOT RUN'},null,2)+'\n');
console.log('PASS: four clips play and seek; one at a time; Chromium/WebKit; desktop/mobile.');
