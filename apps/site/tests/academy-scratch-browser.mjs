// Use a local, non-published site. Measure the real mixer upstream of muted speakers.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {silenceSpeakers} from './silent-audio.mjs';
const base=process.env.JAMLOOM_TEST_URL??'http://127.0.0.1:3009';
assert.equal(new URL(base).hostname,'127.0.0.1');
const browser=await chromium.launch({channel:'chrome'});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.addInitScript(silenceSpeakers);
 await context.addInitScript(()=>{
  window.scratchMessages=[];
  const Native=window.AudioWorkletNode;
  window.AudioWorkletNode=class extends Native{constructor(c,n,o){
   super(c,n,o);
   if(n==='jamloom-deck'){
    const send=this.port.postMessage.bind(this.port);
    this.port.postMessage=(message,...args)=>{window.scratchMessages.push(message);return send(message,...args);};
   }
  }};
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/academy/challenges/first-crossfade');
 await page.locator('#academy-load').click();
 await page.waitForFunction(()=>document.querySelector('#academy-feedback')?.textContent.includes('Tracks ready'),null,{timeout:60000});
 assert.equal(await page.title(),'Your first crossfade · Jamloom DJ Academy');
 await page.locator('#seek-a').fill('15');await page.locator('#seek-a').dispatchEvent('input');
 const jog=page.locator('#jog-a');await jog.scrollIntoViewIfNeeded();
 const r=await jog.boundingBox();
 async function drag({cancel=false}={}){
  await page.mouse.move(r.x+r.width*.9,r.y+r.height*.5);await page.mouse.down();await page.waitForTimeout(100);
  const peaks=[0,0];
  for(let i=0;i<30;i++){
   const a=(i<15?i:30-i)*.1;
   await page.mouse.move(r.x+r.width*.5+Math.cos(a)*r.width*.4,r.y+r.height*.5+Math.sin(a)*r.height*.4);
   await page.waitForTimeout(25);
   const half=i<15?0:1;peaks[half]=Math.max(peaks[half],await page.locator('#output-meter').evaluate(e=>e.value));
  }
  // A held, stationary record must stop making sound.
  await page.waitForTimeout(350);assert.equal(await page.locator('#output-meter').evaluate(e=>e.value),0);
  if(cancel)await page.locator('#pause-all').evaluate(e=>e.click());
  await page.mouse.up();await page.waitForTimeout(150);
  assert(peaks.every(p=>p>.001),'Forward and reverse drags must both produce mixer audio');
  return peaks;
 }
 const paused=await drag();assert.equal(await page.locator('#state-a').textContent(),'Ready');
 await page.locator('#play-a').click();await page.waitForTimeout(300);
 const playing=await drag();assert.equal(await page.locator('#state-a').textContent(),'Playing');
 await drag({cancel:true});assert.equal(await page.locator('#state-a').textContent(),'Ready');
 const speeds=await page.evaluate(()=>window.scratchMessages.filter(m=>m.type==='scratch').map(m=>m.speed));
 assert(speeds.some(s=>s>0)&&speeds.some(s=>s<0));
 assert.deepEqual(errors,[]);
 assert.equal(await page.locator('nextjs-portal').filter({has:page.locator('[data-nextjs-dialog]')}).count(),0);
 await page.screenshot({path:'/tmp/jamloom-academy-scratch.png'});
 console.log(JSON.stringify({status:'PASS',url:page.url(),pausedForwardReversePeak:paused,playingForwardReversePeak:playing,stationarySilent:true,pauseAllCancelsResume:true,errors,screenshot:'/tmp/jamloom-academy-scratch.png'}));
}finally{await browser.close();}
