// Real-time engineering endurance, synthetic audio; not a DJ/listening qualification.
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {silenceSpeakers} from './silent-audio.mjs';
const folder=resolve('../../renders/ai-dj-baseline-20261024');await mkdir(folder,{recursive:true});
function fixture(tone){
 const rate=8000,frames=152.5*rate,b=Buffer.alloc(44+frames*2);
 b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(frames*2,40);
 for(let i=0;i<frames;i++){const t=i/rate,v=.12*Math.sin(2*Math.PI*tone*t)+.25*Math.sin(2*Math.PI*80*t)*Math.exp(-(t%.5)*40);b.writeInt16LE(Math.round(v*32767),44+i*2);}return b;
}
const browser=await chromium.launch();
try{
 const context=await browser.newContext({viewport:{width:1280,height:900}});await context.addInitScript(silenceSpeakers);
 await context.addInitScript(()=>{
  const Native=window.AudioContext;window.endurance={starts:[],ended:0,meter:null};
  window.AudioContext=class extends Native{createBufferSource(){const source=super.createBufferSource(),start=source.start.bind(source);source.start=(...args)=>{window.endurance.starts.push({at:args[0],duration:source.buffer.duration});return start(...args);};source.addEventListener('ended',()=>window.endurance.ended++);return source;}createAnalyser(){const meter=super.createAnalyser();window.endurance.meter=meter;return meter;}};
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
 await page.goto('http://localhost:3000/ai-dj');await page.getByText('Tracks & mix-point review',{exact:true}).click();
 for(const title of ['Party Sector','Black Diamond'])await page.getByRole('button',{name:'Remove '+title,exact:true}).click();
 await page.getByLabel(/I have permission to process/).check();
 const files=Array.from({length:12},(_,i)=>({name:`engineering-${i}.wav`,mimeType:'audio/wav',buffer:fixture(160+i*17)}));
 await page.getByLabel('Add local tracks',{exact:true}).setInputFiles(files);files.length=0;
 await page.getByText('12 tracks added. Files stay on this device.',{exact:true}).waitFor({timeout:120000});
 await page.getByRole('button',{name:'Autopilot · baseline',exact:true}).click();await page.getByRole('button',{name:'Start set'}).click();
 await page.waitForFunction(()=>window.endurance.starts.length>=2);await context.setOffline(true);
 const began=Date.now();let samples=0,quiet=0,maxQuiet=0,maxScheduledSources=0;
 while(Date.now()-began<1850000){
  const state=await page.evaluate(()=>{const {meter,starts,ended}=window.endurance,pcm=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(pcm);return{starts:starts.length,ended,rms:Math.sqrt(pcm.reduce((s,x)=>s+x*x,0)/pcm.length),done:document.body.innerText.includes('Library finished. Add more tracks to continue.')};});
  if(state.done)break;
  assert.deepEqual(errors,[]);assert.ok(Number.isFinite(state.rms));samples++;quiet=state.rms<.0001?quiet+1:0;maxQuiet=Math.max(maxQuiet,quiet);maxScheduledSources=Math.max(maxScheduledSources,state.starts-state.ended);
  if(samples%30===0)console.log(JSON.stringify({elapsed:Math.round((Date.now()-began)/1000),...state}));
  await page.waitForTimeout(1000);
 }
 const state=await page.evaluate(()=>({starts:window.endurance.starts,ended:window.endurance.ended,muted:window.__jamloomSilentOutput().every(o=>o.peak===0)}));
 assert.ok(await page.getByText('Library finished. Add more tracks to continue.',{exact:true}).isVisible());
 assert.equal(state.starts.length,12);assert.ok((Date.now()-began)/1000>=1800);assert.ok(maxScheduledSources<=2);assert.ok(maxQuiet<2,'No sampled silence lasting two seconds');assert.ok(state.muted);assert.deepEqual(errors,[]);
 const report={status:'PASS',browser:'chromium',seconds:(Date.now()-began)/1000,samples,maxQuietSamples:maxQuiet,maxScheduledSources,...state,errors,scope:'12 distinct synthetic engineering tones, offline local blobs, short fallback fades; 1 Hz continuity screen is not sample-accurate or human listening evidence'};
 await writeFile(resolve(folder,'endurance-report.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS 30-minute engineering endurance');
}finally{await browser.close();}
