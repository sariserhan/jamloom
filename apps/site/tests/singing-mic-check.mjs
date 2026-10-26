import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
const folder=new URL('../../../docs/evidence/mic-paired-20261026/',import.meta.url);await mkdir(folder,{recursive:true});
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
  await page.goto('http://127.0.0.1:8767/mic-check.html');await page.locator('#mic-mode').selectOption('standard');await page.locator('#start').click();await page.waitForFunction(()=>window.jamloomMicCheckResult?.completed,undefined,{timeout:45000});
  const r=await page.evaluate(()=>jamloomMicCheckResult);assert(r.frames>1000);assert.equal(r.input.reportedMacMicMode,'standard');assert(r.phases.every(p=>Number.isFinite(p.medianAcRms)&&Number.isFinite(p.medianDcOffset)&&p.clippedFrames===0));assert.equal(typeof r.input.label,'string');assert.match(r.pitchDetectionMeaning,/not identification/);assert(!('deviceId' in r.input));assert.match(await page.locator('#input').textContent(),/^Input:/);assert(r.phases[0].detectedVoicePercent<2);assert(r.phases.slice(1).every(p=>p.detectedVoicePercent>90));assert(r.softwareWindowCenterToAnimationMs.p95<1000);
  assert(await page.evaluate(()=>__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:new URL('mic-'+name+'.png',folder).pathname,fullPage:true});
  await page.locator('#device').selectOption('test-mic');await page.locator('#processing').selectOption('processed');await page.locator('#start').click();await page.waitForTimeout(300);assert(await page.locator('#device').isDisabled());assert.deepEqual(await page.evaluate(()=>__constraints.at(-1)),{channelCount:1,echoCancellation:true,autoGainControl:false,noiseSuppression:true,deviceId:{exact:'test-mic'}});await page.locator('#stop').click();assert.equal(await page.evaluate(()=>jamloomMicCheckResult.completed),false);assert.equal(await page.evaluate(()=>jamloomMicCheckResult.input.requestedProcessing),'browser');assert(!JSON.stringify(await page.evaluate(()=>jamloomMicCheckResult)).includes('test-mic'));assert(await page.locator('#device').isEnabled());
  await page.locator('#start').click();await page.waitForFunction(()=>window.jamloomMicCheckResult?.completed,undefined,{timeout:45000});assert.equal(await page.evaluate(()=>jamloomMicComparisonCount),2);const pair=JSON.parse(await page.locator('#result').textContent());assert.equal(pair.unprocessed.input.requestedProcessing,'raw');assert.equal(pair.browserProcessed.input.requestedProcessing,'browser');
  await page.evaluate(()=>__deny=true);await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#phase').textContent.includes('Allow microphone'));assert(await page.locator('#start').isEnabled());assert.equal(await page.evaluate(()=>__contexts.length),1);
  await page.evaluate(async()=>{__deny=false;await __contexts[0].resume();});
  await page.locator('#input-record').click();await page.evaluate(()=>__contexts[0].resume());await page.waitForFunction(()=>document.querySelector('#input-status').textContent.startsWith('Microphone off'),undefined,{timeout:10000});
  assert(await page.evaluate(()=>__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));
  await page.waitForFunction(()=>document.querySelector('#input-result').textContent.startsWith('{'));const inputSummary=JSON.parse(await page.locator('#input-result').textContent());assert(inputSummary.seconds>=4&&inputSummary.seconds<7);assert(inputSummary.frames>50);assert.equal(inputSummary.detectedPitchPercent,0);assert(inputSummary.simultaneousLive.frames>100);assert.equal(inputSummary.simultaneousLive.detectedPitchPercent,0);assert(inputSummary.simultaneousLive.medianAcRms<.003);assert.equal(inputSummary.input.reportedMacMicMode,'standard');assert(await page.locator('#input-player').isVisible());assert(await page.locator('#input-player').evaluate(a=>a.paused));
  await page.locator('#input-player').evaluate(a=>a.play());await page.waitForFunction(()=>document.querySelector('#input-player').currentTime>.1);
  await page.locator('#input-clear').click();assert.equal(await page.locator('#input-player').getAttribute('src'),null);assert(await page.locator('#input-player').isHidden());
  await page.locator('#input-record').click();await page.evaluate(()=>__contexts[0].resume());await page.waitForFunction(()=>document.querySelector('#input-status').textContent.startsWith('Recording five'));
  await page.locator('#input-clear').click();assert(await page.evaluate(()=>__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));assert(await page.locator('#input-player').isHidden());
  // Recording first must still install interruption cleanup for a later live check.
  await page.reload();await page.locator('#input-record').click();await page.waitForFunction(()=>document.querySelector('#input-result').textContent.startsWith('{'),undefined,{timeout:10000});
  const firstRecording=JSON.parse(await page.locator('#input-result').textContent());assert(firstRecording.simultaneousLive.frames>100);assert.equal(firstRecording.simultaneousLive.detectedPitchPercent,0);
  await page.locator('#start').click();await page.waitForTimeout(200);await page.evaluate(()=>__contexts[0].suspend());await page.waitForFunction(()=>!document.querySelector('#start').disabled);
  assert(await page.evaluate(()=>__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));
  await page.locator('#input-long').click();assert(await page.locator('#input-record').isDisabled());
  await page.waitForFunction(()=>document.querySelector('#input-result').textContent.startsWith('{'),undefined,{timeout:40000});
  const fullRecording=JSON.parse(await page.locator('#input-result').textContent());assert(fullRecording.seconds>29&&fullRecording.seconds<32);
  for(const path of ['live','recorded']){const phases=fullRecording.phases[path];assert.equal(phases.length,4);assert(phases.every(p=>p.frames>100));assert(phases[0].detectedPitchPercent<2);assert(phases.slice(1).every(p=>p.detectedPitchPercent>90));}
  assert(await page.locator('#input-player').evaluate(a=>a.paused));assert(await page.evaluate(()=>__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));
  await page.locator('#input-clear').click();assert.equal(await page.locator('#input-result').textContent(),'');
  await page.locator('#input-long').click();await page.waitForTimeout(150);await page.evaluate(()=>__contexts[0].suspend());await page.waitForFunction(()=>!document.querySelector('#input-long').disabled);assert(await page.locator('#input-player').isHidden());
  assert.deepEqual(errors,[]);
  return{browser:name,controlledPCM:true,humanMicrophone:false,denialStopAndReuse:true,inputRecordingExplicitAndLocal:true,inputRecordingStopsBeforePlayback:true,inputRecordingCleared:true,fullRecording,errors,...r};
 }finally{await browser.close();}
}));
await writeFile(new URL('microphone-browser.json',folder),JSON.stringify({status:'PASS controlled PCM',rows},null,2)+'\n');console.log(JSON.stringify(rows));
