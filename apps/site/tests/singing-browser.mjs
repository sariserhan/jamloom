import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import {writeFile,mkdir} from 'node:fs/promises';
const output=process.env.SINGING_EVIDENCE_DIR||'../../docs/evidence/singing-course-20261026';await mkdir(output,{recursive:true});
const base=process.env.SINGING_BASE_URL||'http://localhost:3000';
const results=[];
for(const [name,type] of [['chromium',chromium],['webkit',webkit]].filter(([name])=>!process.env.SINGING_BROWSER||name===process.env.SINGING_BROWSER)){
 console.log('Testing',name);
 const browser=await type.launch({headless:true,...(name==='chromium'?{args:['--mute-audio']}: {})});
 try {
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.__delivery=[];window.__hz=220;window.__streams=[];window.__contexts=[];window.__mode='tone';
  const Worklet=window.AudioWorkletNode;window.AudioWorkletNode=new Proxy(Worklet,{construct(Target,args){const node=new Target(...args);if(args[1]==='jamloom-instruments'){window.__piano=node;const analyser=args[0].createAnalyser();node.connect(analyser);window.__pianoMeter=analyser;}if(args[1]==='jamloom-singing-capture')node.port.addEventListener('message',({data})=>window.__delivery.push({frames:data.samples.length,delayMs:1000*(args[0].currentTime-data.frame/data.rate)}));return node;}});
  const Audio=window.AudioContext;window.AudioContext=new Proxy(Audio,{construct(Target,args){const c=new Target(...args);window.__contexts.push(c);return c;}});
  const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(destination,...args){if(destination instanceof AudioDestinationNode){const mute=this.context.createGain();mute.gain.value=0;connect.call(mute,destination);return connect.call(this,mute,...args);}return connect.call(this,destination,...args);};
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{
   if(window.__mode==='denied')throw new DOMException('Denied','NotAllowedError');
   const c=window.__contexts.at(-1),osc=c.createOscillator(),gain=c.createGain(),dest=c.createMediaStreamDestination();osc.frequency.value=window.__hz;gain.gain.value=window.__mode==='silence'?0:.2;osc.connect(gain);gain.connect(dest);osc.start();
   const stream=dest.stream;window.__streams.push(stream);
   for(const t of stream.getTracks()){const original=t.stop.bind(t);t.stop=()=>{original();osc.stop();};}
   if(window.__mode==='pending')await new Promise(resolve=>{window.__resolveMic=resolve;});
   return stream;
  }}});
 });
 await page.goto(base+'/singing-academy/lessons/first-note');await page.waitForSelector('#start');assert.match(await page.title(),/Find your note/);
 await page.locator('#help').click();assert(await page.locator('#guide').isVisible());await page.locator('#close-help').click();
 const accessibility=await new AxeBuilder({page}).analyze();assert.deepEqual(accessibility.violations.map(v=>({id:v.id,impact:v.impact})),[]);
 await page.screenshot({path:output+'/'+name+'-lesson.png',fullPage:true});
 await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#mic-state').textContent.includes('ready'));
 await page.waitForFunction(()=>window.__contexts.at(-1)?.currentTime>.05);
 const pianoRms=await page.evaluate(async()=>{let peak=0;for(let i=0;i<12;i++){await new Promise(r=>setTimeout(r,50));const a=new Float32Array(window.__pianoMeter.fftSize);window.__pianoMeter.getFloatTimeDomainData(a);peak=Math.max(peak,Math.sqrt(a.reduce((sum,v)=>sum+v*v,0)/a.length));}return peak;});assert(pianoRms>.0001,'WASM piano must produce real audio');
 await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('Lesson complete'),undefined,{timeout:15000}).catch(async error=>{console.log(await page.evaluate(()=>({body:document.body.innerText,contexts:window.__contexts.map(c=>({state:c.state,time:c.currentTime,rate:c.sampleRate})),tracks:window.__streams.map(s=>s.getTracks().map(t=>({enabled:t.enabled,state:t.readyState})))})));await browser.close();throw error;});
 assert.equal(await page.locator('#mic-state').textContent(),'Microphone off');assert(await page.locator('#start').isEnabled());
 assert(await page.evaluate(()=>window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));
 console.log(name,'correct passed');
 const measured=await page.locator('#measured').textContent();assert.match(measured,/220 Hz/);
 await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#mic-state').textContent.includes('ready'));await page.locator('#stop').click();assert(await page.locator('#start').isEnabled());
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:output+'/'+name+'-mobile.png',fullPage:true});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log(name,'repeat passed');
 if(name==='chromium'){
  for(const mode of ['wrong','silence']){console.log('negative',mode);
   await page.evaluate(mode=>{window.__mode=mode==='silence'?'silence':'tone';window.__hz=mode==='wrong'?330:220;},mode);
   await page.locator('#start').click();await page.waitForFunction(()=>!document.querySelector('#start').disabled,undefined,{timeout:20000});
   assert(!(await page.locator('#result').textContent()).includes('Lesson complete'));assert.equal(await page.locator('#hold-progress').getAttribute('value'),'0');
  }
  console.log('denial');await page.evaluate(()=>window.__mode='denied');await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#feedback').textContent.includes('denied'));assert(await page.locator('#start').isEnabled());
  console.log('pending');await page.evaluate(()=>window.__mode='pending');await page.locator('#start').click();await page.waitForFunction(()=>!!window.__resolveMic,undefined,{timeout:10000});await page.locator('#stop').click();await page.evaluate(()=>window.__resolveMic());
  await page.waitForFunction(()=>window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended')));
 }
 const delivery=await page.evaluate(()=>{const a=window.__delivery.map(r=>r.delayMs).sort((a,b)=>a-b);return {frames:window.__delivery[0]?.frames,observations:a.length,p95DeliveryMs:a[Math.floor(a.length*.95)],scope:'Audio-clock delivery estimate, not physical input latency'};});
 assert.deepEqual(errors,[]);results.push({browser:name,status:'PASS',correct_measured_hz:measured,pianoRms,delivery,accessibilityViolations:accessibility.violations.length,success:true,repeat_and_stop:true,mobile_overflow:false,errors,negative_cases:name==='chromium'?'PASS wrong pitch, silence, denial, late permission cancellation':'NOT RUN'});
 }catch(error){for(const c of browser.contexts())for(const p of c.pages())console.error(name,await p.evaluate(()=>({body:document.body.innerText,mock:String(navigator.mediaDevices.getUserMedia),mode:window.__mode,contexts:window.__contexts?.map(c=>({state:c.state,time:c.currentTime})),tracks:window.__streams?.map(s=>s.getTracks().map(t=>t.readyState))})).catch(()=>''));throw error;}finally{await browser.close();}
}
await writeFile(output+'/singing-browser.json',JSON.stringify({status:'PASS',scope:'Synthetic microphone PCM through actual AudioWorklet and detector, not a physical microphone or human singing assessment',results},null,2)+'\n');console.log(JSON.stringify(results));
