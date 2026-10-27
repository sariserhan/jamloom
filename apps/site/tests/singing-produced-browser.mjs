import {chromium,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.SINGING_BASE_URL||'http://127.0.0.1:3010',output=process.env.SINGING_EVIDENCE_DIR||'../../docs/evidence/singing-produced-20261027',results=[];
await mkdir(output,{recursive:true});
for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch({headless:true,args:name==='chromium'?['--mute-audio']:[]});
 try{
  const context=await browser.newContext(),page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.jamloomMobileMuted=true;window.__streams=[];window.__contexts=[];window.__mode='tone';window.__frames=0;
   const timeout=window.setTimeout.bind(window),clear=window.clearTimeout.bind(window);let startupTimer;
   window.setTimeout=(fn,ms,...args)=>{const timer=timeout(fn,ms,...args);if(ms===30000){startupTimer=timer;window.__startupTimeout=fn;}return timer;};
   window.clearTimeout=timer=>{if(timer===startupTimer)window.__startupTimeout=null;clear(timer);};
   const Audio=window.AudioContext;window.AudioContext=new Proxy(Audio,{construct(Target,args){const c=new Target(...args);window.__contexts.push(c);return c;}});
   const Worklet=window.AudioWorkletNode;window.AudioWorkletNode=new Proxy(Worklet,{construct(Target,args){const node=new Target(...args);if(args[1]==='jamloom-singing-capture')node.port.addEventListener('message',()=>window.__frames++);return node;}});
   Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{
    if(window.__mode==='denied')throw new DOMException('Denied','NotAllowedError');
    const c=window.__contexts.at(-1),osc=c.createOscillator(),gain=c.createGain(),dest=c.createMediaStreamDestination();osc.frequency.value=220;gain.gain.value=.15;osc.connect(gain);gain.connect(dest);osc.start();const stream=dest.stream;window.__streams.push(stream);
    if(window.__mode==='pending')await new Promise(resolve=>window.__resolveMic=resolve);return stream;
   }}});
  });
  await page.goto(base+'/singing-academy');assert.equal(await page.getByRole('link',{name:'Listen & sing →'}).count(),2);
  for(const width of [1280,390])for(const id of ['long-way-home','leave-it-all-outside']){
   await page.setViewportSize({width,height:900});await page.goto(base+'/singing-academy/lessons/'+id);
   await page.waitForSelector('body.produced-lesson');await page.waitForFunction(()=>document.querySelectorAll('#full-lyrics-list p').length>20);
   assert(await page.locator('#recording-player').evaluate(a=>a.paused));assert.equal(await page.evaluate(()=>window.__streams.length),0);
   await page.locator('#demo').click();await page.waitForFunction(()=>document.querySelector('#recording-player').currentTime>.1);
   assert(Math.abs(await page.locator('#recording-player').evaluate(a=>a.duration)-120)<.1);assert.equal(await page.evaluate(()=>window.__streams.length),0);
   await page.locator('#recording-player').evaluate(a=>a.currentTime=65);await page.waitForFunction(()=>document.querySelector('#recording-player').currentTime>=65);
   await page.locator('#stop').click();assert(await page.locator('#recording-player').evaluate(a=>a.paused));
   await page.locator('#section').selectOption('30');await page.locator('#repeat-passage').check();await page.locator('#demo').click();await page.waitForFunction(()=>!document.querySelector('#recording-player').paused);
   await page.locator('#recording-player').evaluate(a=>a.currentTime=59.98);await page.waitForFunction(()=>document.querySelector('#recording-player').currentTime<32);
   await page.locator('#help').click();assert(await page.locator('#guide').isVisible());assert(await page.locator('#recording-player').evaluate(a=>a.paused));await page.locator('#close-help').click();
   assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
   const issues=(await new AxeBuilder({page}).analyze()).violations.map(v=>v.id);assert.deepEqual(issues,[]);
   await page.screenshot({path:`${output}/${name}-${id}-${width}.png`,fullPage:true});results.push({browser:name,width,id,playback:'PASS',seek:'PASS',repeat:'PASS',lyrics:'PASS',accessibility:'PASS'});
  }
  await page.locator('#section').selectOption('all');await page.locator('#repeat-passage').uncheck();await page.locator('#start').click();
  await page.waitForFunction(()=>document.querySelector('#mic-state').textContent==='Microphone listening');
  const tracks=await page.evaluate(()=>window.__streams.at(-1).getAudioTracks().length);
  if(tracks){await page.waitForFunction(()=>/220 Hz/.test(document.querySelector('#feedback').textContent));await page.waitForFunction(()=>window.__frames>3);}
  await page.locator('#recording-player').evaluate(a=>a.pause());await page.waitForFunction(()=>document.querySelector('#mic-state').textContent==='Microphone off');
  assert(await page.evaluate(()=>window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));
  await page.evaluate(()=>window.__mode='denied');await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#feedback').textContent.includes('Allow microphone'));assert(await page.locator('#start').isEnabled());
  await page.evaluate(()=>window.__mode='pending');await page.locator('#start').click();await page.waitForFunction(()=>!!window.__resolveMic);await page.locator('#stop').click();await page.evaluate(()=>window.__resolveMic());await page.waitForFunction(()=>window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended')));assert(await page.locator('#recording-player').evaluate(a=>a.paused));
  for(const button of ['demo','start']){
   await page.evaluate(()=>{window.__mode='tone';window.__finishPlayback=null;document.querySelector('#recording-player').play=()=>new Promise(resolve=>window.__finishPlayback=resolve);});
   await page.locator('#'+button).click();await page.waitForFunction(()=>!!window.__finishPlayback);
   assert(await page.locator('#start').isDisabled());assert(await page.evaluate(()=>typeof window.__startupTimeout==='function'));
   await page.evaluate(()=>window.__startupTimeout());await page.waitForFunction(()=>document.querySelector('#feedback').textContent.includes('timed out'));
   assert(await page.locator('#start').isEnabled());assert(await page.locator('#demo').isEnabled());assert(await page.locator('#stop').isDisabled());
   await page.waitForFunction(()=>window.__contexts.every(c=>c.state==='closed'));assert(await page.evaluate(()=>window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));
   await page.evaluate(()=>window.__finishPlayback());assert(await page.locator('#recording-player').evaluate(a=>a.paused));assert.match(await page.locator('#feedback').textContent(),/timed out/);
  }
  await page.evaluate(()=>{delete document.querySelector('#recording-player').play;window.__mode='pending';window.__resolveMic=null;});
  await page.locator('#start').click();await page.waitForFunction(()=>!!window.__resolveMic);await page.evaluate(()=>window.__startupTimeout());await page.evaluate(()=>window.__resolveMic());
  await page.waitForFunction(()=>window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended')));assert(await page.locator('#recording-player').evaluate(a=>a.paused));
  await page.evaluate(()=>window.__mode='tone');await page.locator('#start').click();await page.waitForFunction(()=>!document.querySelector('#recording-player').paused&&!document.querySelector('#start').disabled);
  assert.equal(await page.evaluate(()=>window.__startupTimeout),null);await page.locator('#stop').click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('jamloom.singing.course.v1')),null);
  await page.goto(base+'/singing-academy/lessons/first-light');await page.locator('#demo').click();await page.waitForFunction(()=>!document.querySelector('#stop').disabled);assert.match(await page.title(),/First Light/);await page.locator('#stop').click();assert(await page.locator('#start').isEnabled());
  assert.deepEqual(errors,[]);results.push({browser:name,microphone:tracks?'PASS synthetic PCM, not real singing':'NOT RUN: browser supplies no synthetic audio track',pauseCleanup:'PASS',denial:'PASS',permissionCancellation:'PASS',songAndKaraokeStartupTimeout:'PASS',latePermissionAfterTimeout:'PASS',latePlaybackAfterTimeout:'PASS',retryAfterTimeout:'PASS',noFabricatedCompletion:'PASS'});
 }finally{await browser.close();}
}
await writeFile(output+'/browser.json',JSON.stringify({results,scope:'Muted browser playback and synthetic input; not musical listening or physical iPhone'},null,2)+'\n');console.log(JSON.stringify(results,null,2));
