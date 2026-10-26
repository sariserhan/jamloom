import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
const base='http://127.0.0.1:8767',output=new URL('../../../docs/evidence/local-audio-followthrough-20261026/',import.meta.url);await mkdir(output,{recursive:true});const results=[];
for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
 console.log('Checking',name);const browser=await type.launch({headless:true});try{
 const context=await browser.newContext({viewport:{width:name==='webkit'?390:1280,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.__contexts=[];window.__streams=[];window.__delays=[];window.__reject=false;
  const Audio=AudioContext;window.AudioContext=new Proxy(Audio,{construct(T,args){const c=new T(...args);window.__contexts.push(c);return c;}});
  const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(dest,...args){if(dest instanceof AudioDestinationNode){const mute=this.context.createGain();mute.gain.value=0;connect.call(mute,dest);return connect.call(this,mute,...args);}return connect.call(this,dest,...args);};
  const Worklet=AudioWorkletNode;window.AudioWorkletNode=new Proxy(Worklet,{construct(T,args){const n=new T(...args);n.port.addEventListener('message',({data})=>window.__delays.push((args[0].currentTime-data.frame/data.rate)*1000));return n;}});
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{
   if(window.__reject)throw new DOMException('denied','NotAllowedError');
   const c=window.__contexts.at(-1),osc=c.createOscillator(),gain=c.createGain(),dest=c.createMediaStreamDestination();gain.gain.value=0;osc.connect(gain);gain.connect(dest);osc.start();
   const media=document.querySelector('audio'),song=await(await fetch('song.json')).json();
   const schedule=()=>{osc.frequency.cancelScheduledValues(c.currentTime);gain.gain.cancelScheduledValues(c.currentTime);gain.gain.value=0;
    for(const section of song.sections)for(const note of section.notes){const at=section.at+note.at-media.currentTime+c.currentTime;if(at>=c.currentTime){osc.frequency.setValueAtTime(note.note===null?220:440*2**((note.note-69)/12),at);gain.gain.setValueAtTime(note.note===null?0:.006,at);}}};
   media.addEventListener('playing',schedule);media.addEventListener('seeked',schedule);
   const stream=dest.stream;window.__streams.push(stream);for(const t of stream.getTracks()){const stop=t.stop.bind(t);t.stop=()=>{stop();osc.stop();media.removeEventListener('playing',schedule);media.removeEventListener('seeked',schedule);};}return stream;
  }}});
 });
 await page.goto(base);assert.match(await page.title(),/Full-length singing rehearsal/);await page.waitForSelector('#lyrics span');assert.equal(await page.locator('#lyrics span').count(),48);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#sing').click();await page.waitForFunction(()=>document.querySelector('#state').textContent==='Microphone listening');await page.waitForFunction(()=>document.querySelector('#feedback').textContent==='On target',undefined,{timeout:15000});
 assert.equal(await page.locator('[aria-current="true"]').textContent(),await page.locator('#lyric').textContent());await page.screenshot({path:'/tmp/jamloom-recording-'+name+'.png',fullPage:true});
 if(name==='chromium'&&!process.argv.includes('--controls-only')){
  const samples=[];for(let i=0;i<4;i++){await page.waitForTimeout(55000);console.log(name,'minute',i+1);samples.push(await page.evaluate(()=>({seconds:document.querySelector('audio').currentTime,heap:performance.memory?.usedJSHeapSize??null,contexts:__contexts.length})));}
  await page.waitForFunction(()=>document.querySelector('audio').ended,undefined,{timeout:30000});assert.match(await page.locator('#result').textContent(),/Full rehearsal matched/);assert(samples.every(s=>s.contexts===1));results.push({browser:name,full240SecondPlayback:true,quietSyntheticVoiceCompleted:true,memorySamples:samples});await writeFile(new URL('recorded-full-playback.json',output),JSON.stringify(results.at(-1),null,2)+'\n');
 }else{await page.locator('#stop').click();results.push({browser:name,quietSyntheticVoiceFollowed:true,mobileOverflow:false});}
 assert(await page.evaluate(()=>__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));await page.selectOption('#passage','96');await page.waitForFunction(()=>Math.abs(document.querySelector('audio').currentTime-96)<.1);
 await page.locator('#sing').click();await page.waitForTimeout(5500);await page.locator('#retry').click();await page.waitForFunction(()=>document.querySelector('audio').currentTime>=96&&document.querySelector('audio').currentTime<98);
 await page.evaluate(()=>document.querySelector('audio').pause());await page.waitForFunction(()=>document.querySelector('#state').textContent==='Microphone off');assert(await page.evaluate(()=>__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));
 await page.locator('#sing').click();await page.waitForTimeout(500);await page.evaluate(()=>window.jamloomSingingStop());await page.waitForFunction(()=>document.querySelector('audio').paused&&__contexts.every(c=>c.state==='suspended')&&__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended')));
 await page.evaluate(()=>window.__reject=true);await page.locator('#sing').click();await page.waitForFunction(()=>document.querySelector('#feedback').textContent.includes('Allow the microphone'));assert(await page.locator('#sing').isEnabled());assert.deepEqual(errors,[]);results.at(-1).seekRetryPauseStopAndDenied=true;results.at(-1).errors=errors;
 }catch(error){for(const c of browser.contexts())for(const p of c.pages())console.error(await p.locator('body').innerText(),await p.locator('#result').evaluate(e=>e.dataset.report?{passed:JSON.parse(e.dataset.report).passed,sections:JSON.parse(e.dataset.report).sections}:null));throw error;}finally{await browser.close();}
}
await writeFile(new URL(process.argv.includes('--controls-only')?'recorded-controls.json':'recorded-browser.json',output),JSON.stringify({status:'PASS',scope:'Actual streamed Jamloom backing with controlled quiet PCM through capture; no human singing or physical latency claim',results},null,2)+'\n');console.log(JSON.stringify(results));
