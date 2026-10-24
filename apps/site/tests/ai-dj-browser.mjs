import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {silenceSpeakers} from './silent-audio.mjs';
const base=process.env.JAMLOOM_AI_DJ_TEST_URL??'http://localhost:3000';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const folder=resolve('../../renders/ai-dj-local-20261024');await mkdir(folder,{recursive:true});
const results=[];
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch();
 try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.addInitScript(silenceSpeakers);
 await context.addInitScript(()=>{
  const Native=window.AudioContext;window.graphs=[];
  window.AudioContext=class extends Native{
   constructor(...args){super(...args);this.probes=[];this.sources=[];this.gains=[];this.filters=[];window.graphs.push(this);}
   createAnalyser(){const node=super.createAnalyser();this.probes.push(node);return node;}
   createBiquadFilter(){const node=super.createBiquadFilter();this.filters.push(node);return node;}
   createGain(){const node=super.createGain();this.gains.push(node);return node;}
   createBufferSource(){const node=super.createBufferSource();this.sources.push(node);return node;}
  };
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/ai-dj');await page.getByRole('heading',{name:'You set the mood. We take the decks.'}).waitFor();
 assert.equal(await page.evaluate(()=>window.graphs.length),0,'no audio before gesture');
 for(const width of [1440,800,390,320]){
  await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width);
  await page.screenshot({path:resolve(folder,`${name}-${width}.png`),fullPage:true});
 }
 await page.setViewportSize({width:1440,height:1000});
 const audit=await new AxeBuilder({page}).include('.ai-dj').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
 assert.deepEqual(audit.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[]);
 const command=async text=>{await page.getByLabel('Tell the DJ',{exact:true}).fill(text);await page.getByRole('button',{name:'Apply DJ direction'}).click();};
 await page.getByRole('button',{name:'Start set'}).click();
 await page.waitForFunction(()=>document.querySelectorAll('.aidj-deck-head span')[0]?.textContent==='PLAYING',{},{timeout:35000});
 await page.waitForFunction(()=>document.querySelectorAll('.aidj-deck-head span')[1]?.textContent==='READY',{},{timeout:35000});
 await page.waitForFunction(()=>Number(document.querySelector('[aria-label="Output peak"]').getAttribute('aria-valuenow'))>.001);
 const first=await page.locator('.deck-0 h2').innerText();
 const peak=await page.getByRole('meter').getAttribute('aria-valuenow');assert.ok(Number(peak)>0&&Number(peak)<1);
 // Record the actual graph upstream of the test-only speaker mute. No microphone access.
 await page.evaluate(()=>{
  const graph=window.graphs[0],tap=graph.createMediaStreamDestination();graph.probes[0].connect(tap);
  const recorder=new MediaRecorder(tap.stream),chunks=[];window.captureDone=new Promise(resolve=>{recorder.ondataavailable=e=>chunks.push(e.data);recorder.onstop=async()=>resolve(Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer())));});window.recorder=recorder;recorder.start();
 });
 await page.getByRole('button',{name:'Play together',exact:true}).click();assert.equal(await page.getByLabel('DJ tone',{exact:true}).isEnabled(),true);
 await page.getByLabel('DJ tone',{exact:true}).fill('6');await page.getByLabel('DJ echo',{exact:true}).fill('0.2');
 await page.waitForTimeout(250);assert.ok(await page.evaluate(()=>Math.abs(window.graphs[0].filters[0].gain.value-6)<.01),'real tone filter');
 await page.getByRole('button',{name:'Autopilot',exact:true}).click();assert.equal(await page.getByLabel('DJ echo',{exact:true}).inputValue(),'0');
 await command('play an unknown artist');assert.match(await page.locator('.aidj-reply').innerText(),/haven’t changed/);
 await command('more energy');assert.equal(await page.getByLabel('Set energy',{exact:true}).inputValue(),'4');
 await page.waitForFunction(()=>document.querySelectorAll('.aidj-deck-head span')[1]?.textContent==='READY');
 await page.getByRole('button',{name:'Mix next →',exact:true}).click();
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('.aidj-deck-head span')).every(n=>n.textContent==='PLAYING'),{},{timeout:12000});
 await page.waitForFunction(()=>{const n=document.querySelector('.aidj-cross-track i');return parseFloat(n.style.left)>10&&parseFloat(n.style.left)<90;});
 await page.screenshot({path:resolve(folder,`${name}-mixing.png`),fullPage:true});
 await page.waitForFunction(()=>document.querySelectorAll('.aidj-deck-head span')[0]?.textContent==='READY',{},{timeout:20000});
 assert.notEqual(await page.locator('.deck-1 h2').innerText(),first);
 if(name==='chromium'){
  console.log('Checking unattended automatic transition and spaced vocal selection…');
  await page.waitForFunction(()=>document.querySelectorAll('.aidj-deck-head span')[0]?.textContent==='PLAYING'&&document.querySelectorAll('.aidj-deck-head span')[1]?.textContent==='READY',{},{timeout:100000});
  assert.equal(await page.locator('.deck-1 h2').innerText(),'House · vocal moment');
  await page.getByRole('button',{name:'Mix next →',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.aidj-deck-head span')[0]?.textContent==='READY'&&document.querySelectorAll('.aidj-deck-head span')[1]?.textContent==='PLAYING',{},{timeout:18000});
  assert.match(await page.locator('.deck-1').innerText(),/VOCAL MOMENT/);
 }

 await command('finish in ten minutes');await page.getByRole('button',{name:'Keep the party going ↗'}).waitFor();
 await command('do not stop');assert.equal(await page.getByRole('button',{name:'Keep the party going ↗'}).count(),0);
 await command('finish in 10 seconds');await page.waitForFunction(()=>document.querySelector('.aidj-reply').textContent.includes('Set finished'),{},{timeout:17000});
 assert.equal(await page.getByRole('button',{name:'Start set'}).isEnabled(),true);
 await page.waitForTimeout(1100);assert.ok(await page.evaluate(()=>window.graphs[0].probes.every(a=>{const d=new Float32Array(a.fftSize);a.getFloatTimeDomainData(d);return d.every(n=>Math.abs(n)<.00001);})), 'silence after finish');
 await page.evaluate(()=>window.recorder.stop());const capture=await page.evaluate(()=>window.captureDone);await writeFile(resolve(folder,`${name}-actual-mix.audio`),Buffer.from(capture));
 assert.ok(await page.evaluate(()=>window.__jamloomSilentOutput().every(o=>o.gain===0&&o.peak===0)),'speakers muted');
 // Cancellation must prevent a late fetch/decode from starting the set.
 await page.route('**/studio/practice-audio/*.mp3',async route=>{await new Promise(r=>setTimeout(r,600));try{await route.continue();}catch{}});
 await page.getByRole('button',{name:'Start set'}).click();await command('stop now');await page.waitForTimeout(1200);
 assert.equal(await page.locator('.aidj-deck-head').filter({hasText:'PLAYING'}).count(),0);
 assert.equal(await page.getByRole('button',{name:'Start set'}).isEnabled(),true);
 await page.unroute('**/studio/practice-audio/*.mp3');
 await page.getByRole('button',{name:'Start set'}).click();await page.waitForFunction(()=>document.querySelector('.aidj-deck-head span').textContent==='PLAYING');
 await page.getByRole('button',{name:'Play together',exact:true}).click();await page.getByLabel('DJ echo',{exact:true}).fill('0.3');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 assert.match(await page.locator('.aidj-reply').innerText(),/tab was hidden/);
 await page.waitForTimeout(200);assert.ok(await page.evaluate(()=>{const a=window.graphs[0].probes[0],d=new Float32Array(a.fftSize);a.getFloatTimeDomainData(d);return d.every(n=>Math.abs(n)<.0001);}),'stop silences echo tails');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});});
 // Every source fails checksum: bounded fallback, then a recoverable error, no playback.
 await page.route('**/studio/practice-audio/*.mp3',r=>r.fulfill({status:200,body:'corrupt audio'}));
 await page.getByRole('button',{name:'Start set'}).click();await page.getByText(/prepared music could not load/).waitFor();assert.equal(await page.getByRole('button',{name:'Start set'}).isEnabled(),true);
 await page.unroute('**/studio/practice-audio/*.mp3');
 assert.deepEqual(errors,[]);
 results.push({browser:name,status:'PASS',widths:[1440,800,390,320],initialPeak:Number(peak),captureBytes:capture.length,checks:['no autoplay','real PCM','two-deck crossfade','direction','shared controls','closing and cancellation','stop during load','hidden tab stop','corrupt bank recovery','accessibility','speaker isolation']});
 console.log(name+' PASS');
 }finally{await browser.close();}
}
await writeFile(resolve(folder,'report.json'),JSON.stringify({status:'PASS',results},null,2)+'\n');console.log(folder);
