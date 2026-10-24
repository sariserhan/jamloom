// Optional local research-artifact check; start the listening server on 8766 first.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium,webkit} from 'playwright';
import {silenceSpeakers} from './silent-audio.mjs';
const results=[];
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch();
 try{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.addInitScript(silenceSpeakers);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const sets=[];
  for(const [path,count] of [['/',15],['/recorded-comparison/',6],['/heldout/',6]]){
   await page.goto('http://localhost:8766'+path);
   assert.equal(await page.locator('audio').count(),count);
   assert.ok(await page.evaluate(()=>[...document.querySelectorAll('audio')].every(a=>a.paused)));
   const rows=await page.evaluate(async()=>{
    const audioContext=new AudioContext();const rows=[];
    try{for(const audio of document.querySelectorAll('audio')){
     const response=await fetch(audio.src);if(!response.ok)throw Error('Missing study');
     const buffer=await audioContext.decodeAudioData(await response.arrayBuffer());
     let peak=0,power=0;for(const sample of buffer.getChannelData(0)){peak=Math.max(peak,Math.abs(sample));power+=sample*sample;}
     rows.push({file:new URL(audio.src).pathname,seconds:buffer.duration,channels:buffer.numberOfChannels,peak,rms:Math.sqrt(power/buffer.length)});
    }}finally{await audioContext.close();}return rows;
   });
   assert.ok(rows.every(r=>r.seconds>28&&r.seconds<32&&r.channels===1&&r.peak>0&&r.peak<1&&r.rms>.001));
   await page.locator('audio').first().evaluate(a=>a.play());
   await page.waitForFunction(()=>document.querySelector('audio').currentTime>.3);
   assert.ok(await page.locator('audio').first().evaluate(a=>a.muted&&!a.paused));
   await page.locator('audio').first().evaluate(a=>a.pause());
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   sets.push({path,rows});
  }
  await page.screenshot({path:resolve('../../renders/club-studies-20261024/'+name+'-listening.png'),fullPage:true});
  assert.deepEqual(errors,[]);results.push({browser:name,status:'PASS',sets,errors});
 }finally{await browser.close();}
}
await writeFile(resolve('../../docs/evidence/ai-dj-baseline-20261024/listening-browser.json'),JSON.stringify({status:'PASS technical',human_listening:'NOT RUN',results},null,2)+'\n');
console.log('PASS: 27 WAVs decode in Chromium and WebKit; muted playback and mobile layout');
