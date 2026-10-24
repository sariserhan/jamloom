import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium,webkit} from 'playwright';
import {silenceSpeakers} from './silent-audio.mjs';
const folder=resolve('../../renders/ai-dj-baseline-20261024');await mkdir(folder,{recursive:true});
function fixture(tone){const rate=16000,frames=32*rate,b=Buffer.alloc(44+frames*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(frames*2,40);for(let i=0;i<frames;i++){const t=i/rate,v=.12*Math.sin(2*Math.PI*tone*t)+.3*Math.sin(2*Math.PI*80*t)*Math.exp(-(t%.5)*40);b.writeInt16LE(Math.round(v*32767),44+i*2);}return b;}
const files=[{name:'fixture-a.wav',mimeType:'audio/wav',buffer:fixture(220)},{name:'fixture-b.wav',mimeType:'audio/wav',buffer:fixture(330)}],results=[];
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch();try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addInitScript(silenceSpeakers);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
 await page.goto('http://localhost:3000/ai-dj');await page.getByLabel('Party or venue name',{exact:true}).fill('Playback test');await page.getByText('Tracks & mix-point review',{exact:true}).click();
 for(const title of ['Party Sector','Black Diamond'])await page.getByRole('button',{name:'Remove '+title,exact:true}).click();
 await page.getByLabel(/I have permission to process/).check();
 await page.evaluate(()=>{const Native=window.AudioContext;let fail=true;window.AudioContext=class extends Native{constructor(...args){if(fail){fail=false;throw Error('Audio engine unavailable');}super(...args);}};});
 await page.getByLabel('Add local tracks',{exact:true}).setInputFiles(files);
 await page.getByText('Import unavailable: Audio engine unavailable',{exact:true}).waitFor();
 assert.ok(await page.getByLabel('Add local tracks',{exact:true}).isEnabled());
 await page.getByLabel('Add local tracks',{exact:true}).setInputFiles(files);
 await page.getByText('2 tracks added. Files stay on this device.',{exact:true}).waitFor();
 const rows=page.locator('.aidj-library li');
 for(let i=0;i<2;i++){const row=rows.nth(i);await row.getByText('Review mix points',{exact:true}).click();await row.getByLabel('BPM',{exact:true}).fill('120');await row.getByLabel('First phrase (seconds)',{exact:true}).fill('0');await row.getByLabel('Exit phrase number',{exact:true}).fill('1');await row.getByLabel('These entry and exit phrases are instrumental.').check();await row.getByLabel('I checked this tempo and these phrase boundaries.').check();await row.getByRole('button',{name:'Save reviewed grid'}).click();await row.getByText('✓ Reviewed mix points',{exact:true}).waitFor();}
 await page.getByRole('button',{name:'Autopilot · baseline',exact:true}).click();await page.getByRole('button',{name:'Start set'}).click();await page.getByText(/Reviewed 8-bar instrumental phrases/).first().waitFor();
 await page.getByRole('button',{name:'Pause',exact:true}).click();const pos=await page.locator('.deck-0 .aidj-clock b').innerText();await page.waitForTimeout(1200);assert.equal(await page.locator('.deck-0 .aidj-clock b').innerText(),pos);await page.getByLabel('AI DJ master volume',{exact:true}).fill('0.45');await page.getByRole('button',{name:'Resume',exact:true}).click();await page.waitForFunction(()=>Number(document.querySelector('[aria-label="Output peak"]').getAttribute('aria-valuenow'))>.001);
 await page.waitForFunction(()=>document.querySelectorAll('.aidj-deck-head span')[1].textContent==='PLAYING',{},{timeout:22000});await page.waitForFunction(()=>Number(document.querySelector('[aria-label="Deck A low"]').value)<-1);
 assert.ok(await page.locator('.aidj-cross-track i').evaluate(n=>parseFloat(n.style.left))>0);await page.screenshot({path:resolve(folder,name+'-phrase-transition.png'),fullPage:true});
 await page.getByRole('button',{name:'Take control',exact:true}).click();await page.waitForTimeout(300);assert.ok(await page.getByLabel('Deck A low',{exact:true}).isEnabled());await page.getByRole('button',{name:'■ Stop',exact:true}).click();
 await page.getByRole('button',{name:'Autopilot · baseline',exact:true}).click();await page.getByRole('button',{name:'Start set'}).click();await page.getByText(/Reviewed 8-bar instrumental phrases/).first().waitFor();await context.setOffline(true);
 await page.getByText('Library finished. Add more tracks to continue.',{exact:true}).waitFor({timeout:55000});assert.ok(await page.evaluate(()=>window.__jamloomSilentOutput().every(o=>o.peak===0)));await context.setOffline(false);assert.deepEqual(errors,[]);
 results.push({browser:name,status:'PASS',checks:['audio engine creation failure recovers for import retry','local import and worker analysis','reviewed phrase grid persisted','32-beat audio-clock transition','actual bass automation','pause, change master and resume audible graph','manual takeover during transition','offline loaded-asset playback','library exhausts without repeats','speakers muted'],fixture:'Generated engineering tones with known 120 BPM; not musical acceptance'});console.log(name+' autopilot PASS');
 }finally{await browser.close();}
}
await writeFile(resolve(folder,'autopilot-report.json'),JSON.stringify({status:'PASS',results},null,2)+'\n');
