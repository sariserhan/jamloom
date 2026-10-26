// Browser plugin's Node REPL runtime is unavailable; use the previously authorized muted Playwright fallback.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {silenceSpeakers} from './silent-audio.mjs';
const quality=process.argv.includes('--quality'),originals=process.argv.includes('--originals');
assert.ok(!originals||quality,'Originals belongs to the quality campaign');
const folder=quality?'../../docs/evidence/dj-quality-20261025':'../../docs/evidence/dj-audible-comparison-20261025',results=[],count=quality?(originals?6:2):4;
await mkdir(folder,{recursive:true});
for(const [name,engine] of Object.entries({chromium,webkit})){
 const browser=await engine.launch();
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addInitScript(silenceSpeakers);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8766/'+(quality?(originals?'quality-originals':'quality-comparison'):'audible-comparison')+'/review/');assert.equal(await page.locator('audio').count(),count);
  assert.match(await page.title(),/Jamloom/);assert.ok(await page.locator('h1').innerText());
  await page.waitForFunction(()=>[...document.querySelectorAll('audio')].every(a=>Number.isFinite(a.duration)&&a.duration>50));
  assert.ok(await page.locator('audio').evaluateAll(nodes=>nodes.every(a=>a.paused&&!a.autoplay)));
  const clips=[];
  for(let i=0;i<count;i++){
   const clip=page.locator('audio').nth(i);
   await clip.evaluate(async a=>{await a.play();});
   await page.waitForFunction(i=>document.querySelectorAll('audio')[i].currentTime>.15,i);
   assert.equal(await page.locator('audio').evaluateAll(nodes=>nodes.filter(a=>!a.paused).length),1);
   await clip.evaluate(a=>{a.currentTime=30;});
   await page.waitForFunction(i=>{const a=document.querySelectorAll('audio')[i];return !a.seeking&&a.currentTime>=30},i);
   clips.push(await clip.evaluate(a=>({label:a.getAttribute('aria-label'),seconds:a.duration,error:a.error?.code??null})));
  }
  await page.locator('audio').evaluateAll(nodes=>nodes.forEach(a=>a.pause()));
  await page.screenshot({path:folder+'/'+name+(originals?'-originals':'')+'-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:folder+'/'+name+(originals?'-originals':'')+'-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);assert.ok(clips.every(c=>c.error===null));results.push({engine:name,status:'PASS',clips,errors});
 }finally{await browser.close();}
}
await writeFile(folder+(originals?'/browser-originals.json':'/browser.json'),JSON.stringify({results,speakerOutput:'Muted',humanListening:'NOT RUN'},null,2)+'\n');
console.log(`PASS: ${count} clips play and seek; one at a time; Chromium/WebKit; desktop/mobile.`);
