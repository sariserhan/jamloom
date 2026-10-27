import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const url=process.env.JAMLOOM_TIMING_URL??'http://127.0.0.1:8767/singing-timing.html';
assert(['127.0.0.1','localhost'].includes(new URL(url).hostname));
const out=process.env.JAMLOOM_EVIDENCE_DIR??'/tmp/jamloom-audio-timing';mkdirSync(out,{recursive:true});const results=[];
for(const [name,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch();try{
 let zero;
 for(const mode of ['zero','loopback','silence','denied','cancel']){
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({mode})=>{
   const Native=window.AudioContext;let context,destination;window.testStreams=[];
   window.AudioContext=class extends Native{constructor(options){super(options);context=this;}createBufferSource(){const source=super.createBufferSource(),connect=source.connect.bind(source);source.connect=target=>{if(target===this.destination){if(mode==='loopback'||mode==='zero'){const delay=this.createDelay();delay.delayTime.value=mode==='zero'?0:.06;connect(delay);delay.connect(destination);}return target;}return connect(target);};return source;}};
   navigator.mediaDevices.getUserMedia=async()=>{
    if(mode==='denied')throw new DOMException('Denied','NotAllowedError');
    destination=context.createMediaStreamDestination();const stream=destination.stream;window.testStreams.push(stream);
    if(mode==='cancel')await new Promise(r=>setTimeout(r,500));return stream;
   };
  },{mode});
  await page.goto(url);await page.locator('#start').click();
  if(mode==='cancel'){await page.locator('#stop').click();await page.waitForTimeout(700);}
  else if(mode==='denied')await page.getByRole('status').filter({hasText:'Microphone denied'}).waitFor();
  else await page.waitForFunction(()=>document.querySelector('#result').textContent.length>0,{},{timeout:12000});
  const result=await page.locator('#result').textContent();
  if(mode==='zero'||mode==='loopback'){const r=JSON.parse(result);assert.equal(r.status,'MEASURED');if(mode==='zero')zero=r.roundTripMs;else assert(Math.abs(r.roundTripMs-zero-60)<8,JSON.stringify({zero,...r}));assert.equal(r.detectedProbes,5);}
  if(mode==='silence')assert.equal(JSON.parse(result).status,'INCONCLUSIVE');
  assert(await page.locator('#start').isEnabled());assert(await page.locator('#stop').isDisabled());
  assert(await page.evaluate(()=>testStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  if(mode==='loopback')await page.screenshot({path:out+'/'+name+'.png',fullPage:true});
  results.push({browser:name,mode,result:result?JSON.parse(result):null,cleanup:'PASS',overflow:false,errors});await page.close();
 }
 }finally{await browser.close();}
}
writeFileSync(out+'/browser.json',JSON.stringify({results,limitation:'Synthetic delayed PCM and permission failures, not physical speaker/microphone latency.'},null,2)+'\n');console.log(JSON.stringify(results));
