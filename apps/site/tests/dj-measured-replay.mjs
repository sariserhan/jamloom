// Replay two retained originals through the real browser mixer; no generation or human-grid override.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {silenceSpeakers} from './silent-audio.mjs';
const folder=resolve('../../renders/ai-dj-finish-20261024/gpu-launch-fix');
const result=JSON.parse(await readFile(resolve(folder,'result.json'),'utf8'));
const session=result.customers.find(c=>c.visibility==='public').session;
const tracks=result.tracks.filter(t=>t.session===session&&t.sequence<2).sort((a,b)=>a.sequence-b.sequence);
assert.equal(tracks.length,2);
const files=await Promise.all(tracks.map(async(t,i)=>{const buffer=await readFile(resolve(folder,`${t.session}-${t.sequence}.wav`));assert.equal(createHash('sha256').update(buffer).digest('hex'),t.sha256);return {name:`measured-${i+1}.wav`,mimeType:'audio/wav',buffer};}));
const browser=await chromium.launch({args:['--disable-audio-output']});
const report={status:'RUNNING',scope:'Retained GPU audio playback only, not new generation or human phrase review',hashes:tracks.map(t=>t.sha256),samples:[],errors:[]};
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addInitScript(silenceSpeakers);const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('http://localhost:3000/ai-dj');await page.getByLabel('Party or venue name',{exact:true}).fill('Measured handoff replay');await page.getByText('Tracks & mix-point review',{exact:true}).click();
 for(const title of ['Party Sector','Black Diamond'])await page.getByRole('button',{name:'Remove '+title,exact:true}).click();
 await page.getByLabel(/I have permission to process/).check();await page.getByLabel('Add local tracks',{exact:true}).setInputFiles(files);await page.getByText('2 tracks added. Files stay on this device.',{exact:true}).waitFor();
 // Fixture ratings select the known pair in order; no timing review is fabricated.
 await page.getByLabel('Energy for measured-1').selectOption('4');await page.getByLabel('Energy for measured-2').selectOption('3');
 await page.getByRole('button',{name:'Autopilot · baseline',exact:true}).click();await page.getByRole('button',{name:'Start set'}).click();
 await page.getByText(/Measured steady beats/).first().waitFor();
 await page.waitForFunction(()=>document.querySelectorAll('.aidj-deck-head span')[1]?.textContent==='PLAYING',null,{timeout:65000});
 for(let i=0;i<25;i++){report.samples.push(await page.evaluate(()=>({lowA:Number(document.querySelector('[aria-label="Deck A low"]').value),lowB:Number(document.querySelector('[aria-label="Deck B low"]').value),cross:Number.parseFloat(document.querySelector('.aidj-cross-track i').style.left),peak:Number(document.querySelector('[aria-label="Output peak"]').getAttribute('aria-valuenow'))})));await page.waitForTimeout(100);}
 assert.ok(report.samples.some(s=>s.lowA< -1&&s.cross>0&&s.cross<100));assert.ok(report.samples.some(s=>s.peak>.001));
 report.analysis=await page.evaluate(()=>JSON.parse(localStorage.getItem('jamloom.ai-dj.analysis.v1')??'[]'));
 assert.ok(report.analysis.every(a=>!a.review));await page.screenshot({path:resolve(folder,'measured-replay.png'),fullPage:true});
 await page.getByRole('button',{name:'■ Stop',exact:true}).click();assert.ok(await page.evaluate(()=>__jamloomSilentOutput().every(o=>o.peak===0)));assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.failure=String(error);throw error;}finally{await browser.close();await writeFile('../../docs/evidence/ai-dj-finish-20261024/launch-fix-measured-replay.json',JSON.stringify(report,null,2)+'\n');}
