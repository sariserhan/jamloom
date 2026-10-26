import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile,appendFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {silenceSpeakers} from './silent-audio.mjs';
const root=new URL('../../../',import.meta.url),folder=new URL('docs/evidence/reliability-followthrough-20261026/',root),review=new URL('renders/club-studies-20261024/stem-performance/review/',root);
await mkdir(folder,{recursive:true});const rows=[];
for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();try{
  const context=await browser.newContext({viewport:{width:name==='webkit'?390:1280,height:900}});await context.addInitScript(silenceSpeakers);await context.addInitScript(()=>{window.__stemContexts=[];const Native=AudioContext;window.AudioContext=class extends Native{constructor(...args){super(...args);__stemContexts.push(this);}};window.__gainWrites=[];const write=AudioParam.prototype.setTargetAtTime;AudioParam.prototype.setTargetAtTime=function(value,...args){__gainWrites.push(value);return write.call(this,value,...args);};});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8766/stem-performance/review/');
  await page.getByRole('button',{name:'Perform set',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Groove'));
  await page.waitForTimeout(1200);assert.equal(await page.getByRole('button',{name:'Stop',exact:true}).isEnabled(),true);
  await page.locator('#bass-level').fill('0.35');assert.equal(await page.evaluate(()=>__gainWrites.at(-1)),.35);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:new URL(name+'.png',folder).pathname,fullPage:true});
  await page.getByRole('button',{name:'Stop',exact:true}).click();assert.equal(await page.locator('#status').textContent(),'Stopped');
  await page.waitForTimeout(100);assert((await page.evaluate(()=>__jamloomSilentOutput())).every(m=>m.peak===0));
  let render=null,live=null;
  if(name==='chromium'){
   await page.locator('#bass-level').fill('0.7');await page.getByRole('button',{name:'Perform set',exact:true}).click();
   const began=Date.now();await page.waitForFunction(()=>document.querySelector('#vocals span').textContent!=='Rest'&&/56%/.test(document.querySelector('#vocals span').textContent),undefined,{timeout:145000});
   const vocalAt=(Date.now()-began)/1000;await page.waitForFunction(()=>document.querySelector('#status').textContent==='Finished',undefined,{timeout:110000});
   live={seconds:(Date.now()-began)/1000,vocalAt};assert(live.seconds>=209&&live.seconds<220);assert(vocalAt>120&&vocalAt<130);assert.equal(await page.evaluate(()=>__stemContexts.length),1);await page.waitForFunction(()=>__stemContexts[0].state==='suspended');

   const wav=new URL('performance.wav',review),frames=211*48000,header=Buffer.alloc(44);
   header.write('RIFF');header.writeUInt32LE(36+frames*4,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(2,22);header.writeUInt32LE(48000,24);header.writeUInt32LE(192000,28);header.writeUInt16LE(4,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(frames*4,40);await writeFile(wav,header);
   await page.exposeFunction('savePCM',async s=>appendFile(wav,Buffer.from(s,'base64')));
   render=await page.evaluate(async()=>{
    const began=performance.now(),{renderStudy}=await import('./review.js'),audio=await renderStudy(),left=audio.getChannelData(0),right=audio.getChannelData(1);let peak=0,sum=0,quiet=0,maxQuiet=0,energyWindow=0;
    for(let i=0;i<audio.length;i++){peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));sum+=left[i]**2+right[i]**2;energyWindow+=left[i]**2+right[i]**2;if((i+1)%960===0){if(i>48000&&i<audio.length-3*48000&&Math.sqrt(energyWindow/1920)<.001)quiet+=.02;else quiet=0;maxQuiet=Math.max(maxQuiet,quiet);energyWindow=0;}}
    for(let start=0;start<audio.length;start+=48000){const n=Math.min(48000,audio.length-start),pcm=new Int16Array(n*2);for(let j=0;j<n;j++){pcm[j*2]=Math.round(left[start+j]*32767);pcm[j*2+1]=Math.round(right[start+j]*32767);}const bytes=new Uint8Array(pcm.buffer);let text='';for(let k=0;k<bytes.length;k+=8192)text+=String.fromCharCode(...bytes.subarray(k,k+8192));await window.savePCM(btoa(text));}
    return{seconds:audio.duration,peak,rms:Math.sqrt(sum/(audio.length*2)),maxInternalQuietSeconds:maxQuiet,renderAndExportSeconds:(performance.now()-began)/1000};
   });
   assert.equal(render.seconds,211);assert(render.peak>.01&&render.peak<1);assert(render.rms>.01);assert(render.maxInternalQuietSeconds<.25);
   execFileSync('ffmpeg',['-v','error','-y','-i',wav.pathname,'-c:a','libmp3lame','-b:a','192k',new URL('performance.mp3',review).pathname]);
   render.sha256=createHash('sha256').update(await readFile(wav)).digest('hex');
  }
  for(const id of ['rendered','baseline']){await page.locator('#'+id).evaluate(a=>{a.load();return a.play();});await page.waitForFunction(id=>document.getElementById(id).currentTime>.1,id);await page.locator('#'+id).evaluate(a=>a.currentTime=10);await page.waitForFunction(id=>!document.getElementById(id).seeking&&document.getElementById(id).currentTime>=10,id);assert.equal(await page.evaluate(()=>[...document.querySelectorAll('audio')].filter(a=>!a.paused).length),1);await page.locator('#'+id).evaluate(a=>a.pause());}
  assert.deepEqual(errors,[]);rows.push({browser:name,controls:true,playSeekStop:true,overflow:false,errors,render,live});
 }finally{await browser.close();}
}
await writeFile(new URL('browser.json',folder),JSON.stringify({status:'PASS technical',newGeneration:false,humanListening:'NOT RUN',rows},null,2)+'\n');console.log(JSON.stringify(rows));
