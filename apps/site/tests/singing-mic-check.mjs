import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
const folder=new URL('../../../docs/evidence/coherent-performance-20261026/',import.meta.url);await mkdir(folder,{recursive:true});
const rows=await Promise.all([['chromium',chromium],['webkit',webkit]].map(async([name,type])=>{
 const browser=await type.launch();try{
  const page=await browser.newPage({viewport:{width:name==='webkit'?390:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.__contexts=[];window.__streams=[];window.__constraints=[];window.__deny=false;
   const A=AudioContext;window.AudioContext=new Proxy(A,{construct(T,args){const c=new T(...args);__contexts.push(c);return c;}});
   Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{enumerateDevices:async()=>[{kind:'audioinput',deviceId:'test-mic',label:'Test microphone'}],getUserMedia:async(options)=>{
    __constraints.push(options.audio);
    if(__deny)throw new DOMException('denied','NotAllowedError');const c=__contexts.at(-1),osc=c.createOscillator(),gain=c.createGain(),lfo=c.createOscillator(),depth=c.createGain(),dest=c.createMediaStreamDestination();
    const t=c.currentTime;osc.frequency.value=220;lfo.frequency.value=5;depth.gain.value=0;depth.gain.setValueAtTime(3,t+22.5);lfo.connect(depth);depth.connect(osc.frequency);gain.gain.value=0;gain.gain.setValueAtTime(.12,t+7.5);gain.gain.setValueAtTime(.006,t+15);gain.gain.setValueAtTime(.12,t+22.5);osc.connect(gain);gain.connect(dest);osc.start();lfo.start();
    const stream=dest.stream;__streams.push(stream);for(const track of stream.getTracks()){const stop=track.stop.bind(track);track.stop=()=>{stop();osc.stop();lfo.stop();};}return stream;
   }}});
  });
  await page.goto('http://127.0.0.1:8767/mic-check.html');await page.locator('#start').click();await page.waitForFunction(()=>window.jamloomMicCheckResult?.completed,undefined,{timeout:45000});
  const r=await page.evaluate(()=>jamloomMicCheckResult);assert(r.frames>1000);assert.equal(typeof r.input.label,'string');assert.match(r.pitchDetectionMeaning,/not identification/);assert(!('deviceId' in r.input));assert.match(await page.locator('#input').textContent(),/^Input:/);assert(r.phases[0].detectedVoicePercent<2);assert(r.phases.slice(1).every(p=>p.detectedVoicePercent>90));assert(r.softwareWindowCenterToAnimationMs.p95<1000);
  assert(await page.evaluate(()=>__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:new URL('mic-'+name+'.png',folder).pathname,fullPage:true});
  await page.locator('#device').selectOption('test-mic');await page.locator('#processing').selectOption('processed');await page.locator('#start').click();await page.waitForTimeout(300);assert(await page.locator('#device').isDisabled());assert.deepEqual(await page.evaluate(()=>__constraints.at(-1)),{channelCount:1,echoCancellation:true,autoGainControl:false,noiseSuppression:true,deviceId:{exact:'test-mic'}});await page.locator('#stop').click();assert.equal(await page.evaluate(()=>jamloomMicCheckResult.completed),false);assert.equal(await page.evaluate(()=>jamloomMicCheckResult.input.requestedProcessing),'browser');assert(!JSON.stringify(await page.evaluate(()=>jamloomMicCheckResult)).includes('test-mic'));assert(await page.locator('#device').isEnabled());
  await page.locator('#start').click();await page.waitForFunction(()=>window.jamloomMicCheckResult?.completed,undefined,{timeout:45000});assert.equal(await page.evaluate(()=>jamloomMicComparisonCount),2);const pair=JSON.parse(await page.locator('#result').textContent());assert.equal(pair.unprocessed.input.requestedProcessing,'raw');assert.equal(pair.browserProcessed.input.requestedProcessing,'browser');
  await page.evaluate(()=>__deny=true);await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#phase').textContent.includes('Allow microphone'));assert(await page.locator('#start').isEnabled());assert.equal(await page.evaluate(()=>__contexts.length),1);assert.deepEqual(errors,[]);
  return{browser:name,controlledPCM:true,humanMicrophone:false,denialStopAndReuse:true,errors,...r};
 }finally{await browser.close();}
}));
await writeFile(new URL('microphone-browser.json',folder),JSON.stringify({status:'PASS controlled PCM',rows},null,2)+'\n');console.log(JSON.stringify(rows));
