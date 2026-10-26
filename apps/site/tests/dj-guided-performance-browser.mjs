// Retained original through the actual deck; no generation, uploads or audible speakers.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium,webkit} from 'playwright';
import {silenceSpeakers} from './silent-audio.mjs';
const root='../..',source=root+'/renders/dj-guided-set-20261025',out=root+'/docs/evidence/dj-guided-set-20261025';
const run=JSON.parse(await readFile(source+'/report.json','utf8')),row=run.tracks[0],buffer=await readFile(source+'/'+row.file);
assert.equal(createHash('sha256').update(buffer).digest('hex'),row.receipt.sha256);
const reports=[];
for(const [name,engine] of Object.entries({chromium,webkit})){
 const browser=await engine.launch();
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addInitScript(silenceSpeakers);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
  await page.goto('http://localhost:3000/ai-dj');await page.getByLabel('Party or venue name',{exact:true}).fill('Guided deck check');
  await page.getByText('Tracks & mix-point review',{exact:true}).click();
  for(const title of ['Party Sector','Black Diamond'])await page.getByRole('button',{name:'Remove '+title,exact:true}).click();
  await page.getByLabel(/I have permission to process/).check();
  await page.getByLabel('Add local tracks',{exact:true}).setInputFiles({name:'Guided original.wav',mimeType:'audio/wav',buffer});
  await page.getByText('1 tracks added. Files stay on this device.',{exact:true}).waitFor();
  await page.getByLabel('Energy for Guided original').selectOption('4');
  await page.getByRole('button',{name:'Autopilot · baseline',exact:true}).click();await page.getByRole('button',{name:'Start set'}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('.aidj-knob input[aria-label$=" filter"]')].some(n=>Number(n.value)>.1),null,{timeout:45000});
  const event=await page.evaluate(()=>({history:document.querySelector('[aria-label="Performance history"]').innerText,filter:[...document.querySelectorAll('.aidj-knob input[aria-label$=" filter"]')].map(n=>Number(n.value)),peak:Number(document.querySelector('[aria-label="Output peak"]').getAttribute('aria-valuenow'))}));
  assert.match(event.history,/AI/);assert.ok(event.peak>.001);await page.locator('[aria-label="AI DJ decks"]').screenshot({path:out+'/guided-deck-'+name+'.png'});
  await page.getByRole('button',{name:'Take control',exact:true}).click();await page.waitForTimeout(400);
  assert.ok(await page.evaluate(()=>[...document.querySelectorAll('.aidj-knob input[aria-label$=" filter"]')].every(n=>Number(n.value)<.01)));
  await page.getByRole('button',{name:'■ Stop',exact:true}).click();
  assert.ok(await page.evaluate(()=>__jamloomSilentOutput().every(v=>v.peak===0)));assert.deepEqual(errors,[]);
  reports.push({browser:name,status:'PASS',sha256:row.receipt.sha256,event,manualTakeoverResets:true,speakersMuted:true,errors});
 }finally{await browser.close();}
}
await writeFile(out+'/guided-deck-browser.json',JSON.stringify({scope:'Actual local deck automatic move and manual cancellation; no new generation or cloud writes',humanListening:'NOT RUN',reports},null,2)+'\n');
console.log('Guided deck browser PASS');
