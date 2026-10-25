// Replays a retained problem transition through the actual player; no GPU or new generation.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {silenceSpeakers} from './silent-audio.mjs';
const folder=resolve('../../renders/ai-dj-beta-20261025'),result=JSON.parse(await readFile(resolve(folder,'result.json'),'utf8'));
const session=result.customers.find(c=>c.visibility==='private').session;
const tracks=result.tracks.filter(t=>t.session===session&&[3,4].includes(t.sequence)).sort((a,b)=>a.sequence-b.sequence);assert.equal(tracks.length,2);
const files=await Promise.all(tracks.map(async(t,i)=>{const buffer=await readFile(resolve(folder,t.session+'-'+t.sequence+'.wav'));assert.equal(createHash('sha256').update(buffer).digest('hex'),t.sha256);return {name:`padding-${i+1}.wav`,mimeType:'audio/wav',buffer};}));
const browser=await chromium.launch({args:['--disable-audio-output']});const report={status:'RUNNING',hashes:tracks.map(t=>t.sha256),errors:[],source:'Retained GPU pair; no new generation'};
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const capture=()=>{window.paddingCaptures=[];const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(target,...ports){if(target instanceof AudioDestinationNode){const tap=this.context.createMediaStreamDestination();connect.call(this,tap);const chunks=[],recorder=new MediaRecorder(tap.stream);recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};window.paddingCaptures.push({recorder,chunks,tap,source:this});recorder.start(1000);}return connect.call(this,target,...ports);};};
 await context.addInitScript('('+silenceSpeakers.toString()+')();('+capture.toString()+')();');
 const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('http://localhost:3000/ai-dj');await page.getByLabel('Party or venue name',{exact:true}).fill('Quiet ending regression');await page.getByText('Tracks & mix-point review',{exact:true}).click();
 for(const title of ['Party Sector','Black Diamond'])await page.getByRole('button',{name:'Remove '+title,exact:true}).click();
 await page.getByLabel(/I have permission to process/).check();await page.getByLabel('Add local tracks',{exact:true}).setInputFiles(files);await page.getByText('2 tracks added. Files stay on this device.',{exact:true}).waitFor();
 await page.getByLabel('Energy for padding-1').selectOption('4');await page.getByLabel('Energy for padding-2').selectOption('3');
 await page.getByRole('button',{name:'Autopilot · baseline',exact:true}).click();await page.getByRole('button',{name:'Start set'}).click();
 await page.waitForFunction(()=>window.paddingCaptures.some(c=>{if(!(c.source instanceof AnalyserNode))return false;const a=new Float32Array(c.source.fftSize);c.source.getFloatTimeDomainData(a);if(a.some(v=>Math.abs(v)>.001)){window.paddingCapture=c;return true;}return false;}),null,{timeout:10000});
 report.captureCount=await page.evaluate(()=>window.paddingCaptures.length);
 await page.waitForFunction(()=>document.querySelector('.deck-1 .aidj-deck-head span')?.textContent==='PLAYING',null,{timeout:65000});
 assert.ok(await page.evaluate(()=>Number(document.querySelector('[aria-label="Output peak"]').getAttribute('aria-valuenow'))>.001));
 report.transitionPosition=await page.locator('.deck-0 .aidj-clock b').innerText();await page.screenshot({path:resolve('../../docs/evidence/ai-dj-beta-20261025/padding-browser.png'),fullPage:true});
 await page.getByText('Library finished. Add more tracks to continue.',{exact:true}).waitFor({timeout:70000});
 report.analysis=await page.evaluate(()=>JSON.parse(localStorage.getItem('jamloom.ai-dj.analysis.v1')??'[]'));assert.ok(report.analysis[0].audible.end<54);assert.ok(report.analysis.every(a=>!a.review));
 const data=await page.evaluate(async()=>{const {recorder,chunks}=window.paddingCapture;await new Promise(resolve=>{recorder.onstop=resolve;recorder.stop();});return await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(new Blob(chunks,{type:recorder.mimeType}));});});
 await writeFile(resolve(folder,'padding-browser.webm'),Buffer.from(data,'base64'));assert.ok(await page.evaluate(()=>__jamloomSilentOutput().every(v=>v.peak===0)));assert.deepEqual(report.errors,[]);
 const scan=spawnSync('ffmpeg',['-nostdin','-hide_banner','-i',resolve(folder,'padding-browser.webm'),'-af','silencedetect=noise=-60dB:d=0.25,volumedetect','-f','null','-'],{encoding:'utf8',timeout:30000});assert.equal(scan.status,0);report.longestQuietSeconds=Math.max(0,...[...scan.stderr.matchAll(/silence_duration: ([\d.]+)/g)].map(m=>Number(m[1])));report.peakDb=Number(scan.stderr.match(/max_volume: ([-\d.]+)/)?.[1]);assert.ok(report.peakDb> -30);assert.ok(report.longestQuietSeconds<.75);report.status='PASS';
}catch(error){report.status='FAIL';report.failure=String(error);throw error;}finally{await browser.close();await writeFile('../../docs/evidence/ai-dj-beta-20261025/padding-browser.json',JSON.stringify(report,null,2)+'\n');}
