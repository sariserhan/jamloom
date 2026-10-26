import {chromium,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';import assert from 'node:assert/strict';import {writeFile,mkdir} from 'node:fs/promises';
const base=process.env.SINGING_BASE_URL||'http://localhost:3000';
const output='../../docs/evidence/singing-course-20261026';await mkdir(output,{recursive:true});const results=[];
for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch({headless:true,...(name==='chromium'?{args:['--mute-audio']}: {})});
 try{const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.__delivery=[];window.__hz=220;window.__streams=[];window.__contexts=[];window.__mode='tone';
  const Worklet=window.AudioWorkletNode;window.AudioWorkletNode=new Proxy(Worklet,{construct(Target,args){const node=new Target(...args);if(args[1]==='jamloom-instruments'){window.__piano=node;const analyser=args[0].createAnalyser();node.connect(analyser);window.__pianoMeter=analyser;}if(args[1]==='jamloom-singing-capture')node.port.addEventListener('message',({data})=>window.__delivery.push({frames:data.samples.length,delayMs:1000*(args[0].currentTime-data.frame/data.rate)}));const post=node.port.postMessage.bind(node.port);node.port.postMessage=(message,...rest)=>{if(message.type==='singing-score'&&window.__input&&window.__exercise&&!window.__exercise.hold&&window.__mode==='tone'){const x=window.__exercise,c=args[0],begin=message.events[0].frame/c.sampleRate+(x.song?0:x.duration+1+4*60/x.tempo);window.__input.gain.gain.setValueAtTime(0,c.currentTime);for(const n of x.phrase){window.__input.osc.frequency.setValueAtTime(n.note===null?220:440*2**((n.note-69)/12),begin+n.at);window.__input.gain.gain.setValueAtTime(n.note===null?0:.2,begin+n.at);}window.__input.gain.gain.setValueAtTime(0,begin+x.duration);}return post(message,...rest);};return node;}});
  const Audio=window.AudioContext;window.AudioContext=new Proxy(Audio,{construct(Target,args){const c=new Target(...args);window.__contexts.push(c);return c;}});
  const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(destination,...args){if(destination instanceof AudioDestinationNode){const mute=this.context.createGain();mute.gain.value=0;connect.call(mute,destination);return connect.call(this,mute,...args);}return connect.call(this,destination,...args);};
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{
   if(window.__mode==='denied')throw new DOMException('Denied','NotAllowedError');
   const c=window.__contexts.at(-1),osc=c.createOscillator(),gain=c.createGain(),dest=c.createMediaStreamDestination();osc.frequency.value=window.__hz;gain.gain.value=window.__mode==='silence'?0:.2;osc.connect(gain);gain.connect(dest);osc.start();
   window.__input={osc,gain};const stream=dest.stream;window.__streams.push(stream);
   for(const t of stream.getTracks()){const original=t.stop.bind(t);t.stop=()=>{original();osc.stop();};}
   if(window.__mode==='pending')await new Promise(resolve=>{window.__resolveMic=resolve;});
   return stream;
  }}});
 });

 await page.goto(base+'/singing-academy');assert.match(await page.title(),/Singing Academy/);await page.waitForFunction(()=>document.querySelectorAll('#course h3').length===2);assert.deepEqual((await new AxeBuilder({page}).analyze()).violations.map(v=>v.id),[]);await page.screenshot({path:output+'/'+name+'-course.png',fullPage:true});
 const exercised=[];
 for(const id of (name==='chromium'?['first-note','step-up','pulse','final-performance']:['first-note','first-melody'])){
  console.log(name,id);await page.goto(base+'/singing-academy/lessons/'+id);await page.waitForSelector('#start');
  if(id!=='first-note')await page.selectOption('#tempo','100');
  await page.evaluate(async id=>{const m=await import('/studio/singing-course.js'),l=m.lessonById(id),phrase=m.phraseFor(l,57,100);window.__exercise={hold:l.hold,phrase,duration:phrase.at(-1).at+phrase.at(-1).duration,tempo:100};},id);
  if(id==='first-note'){await page.locator('#demo').click();await page.waitForFunction(()=>!document.querySelector('#demo').disabled);assert.equal(await page.evaluate(()=>window.__streams.length),0);await page.locator('#help').click();assert(await page.locator('#guide').isVisible());await page.locator('#close-help').click();}
  if(id==='final-performance')await page.locator('#backing').check();
  await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('Lesson complete'),undefined,{timeout:45000});
  assert.equal(await page.locator('#mic-state').textContent(),'Microphone off');assert(await page.evaluate(()=>window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));assert(await page.locator('#continue').isVisible());
  await page.reload();await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('Previously completed'));exercised.push(id);
 }
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:output+'/'+name+'-lesson-mobile.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual((await new AxeBuilder({page}).analyze()).violations.map(v=>v.id),[]);
 await page.goto(base+'/singing-academy/warmups');await page.waitForFunction(()=>document.body.innerText.includes('warm-ups complete'));await page.screenshot({path:output+'/'+name+'-progress-mobile.png',fullPage:true});
 assert.equal(await page.locator('text=✓ Complete').count(),exercised.length);
 const song=name==='chromium'?'city-lights':'in-motion';await page.goto(base+'/singing-academy/lessons/'+song);await page.setViewportSize({width:1280,height:900});await page.waitForSelector('#full-lyrics');assert(await page.evaluate(()=>document.querySelector('#full-lyrics').getBoundingClientRect().left>document.querySelector('#live-chart').getBoundingClientRect().right));await page.screenshot({path:output+'/'+name+'-song-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});
 await page.evaluate(async id=>{const m=await import('/studio/singing-course.js'),l=m.lessonById(id),phrase=m.phraseFor(l,57,l.tempo);window.__exercise={song:true,phrase,duration:phrase.at(-1).at+phrase.at(-1).duration,tempo:l.tempo};},song);
 assert.equal(await page.locator('#full-lyrics-list p').count(),16);assert.equal(await page.locator('#full-lyrics-list span').count(),48);await page.locator('#demo').click();await page.waitForTimeout(1400);assert.equal(await page.evaluate(()=>window.__streams.length),0);await page.locator('#stop').click();
 await page.locator('#start').click();await page.waitForFunction(()=>window.__delivery.length>600);assert(await page.locator('#live-chart').isVisible());assert(await page.locator('#live-chart').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<innerHeight;}));assert.notEqual(await page.locator('#lyrics').textContent(),'♪ Instrumental');assert.equal(await page.locator('#full-lyrics-list .current-word').count(),1);assert.equal(await page.locator('#full-lyrics-list .current-word').textContent(),await page.locator('#lyrics').textContent());const firstHighlighted=await page.locator('#full-lyrics-list .current-word').getAttribute('data-index');await page.waitForTimeout(1700);assert.notEqual(await page.locator('#full-lyrics-list .current-word').getAttribute('data-index'),firstHighlighted);assert(await page.locator('#lyric-next').isVisible());
 await page.screenshot({path:output+'/'+name+'-song-live.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual((await new AxeBuilder({page}).analyze()).violations.map(v=>v.id),[]);
 const delays=await page.evaluate(()=>window.__delivery.map(d=>d.delayMs).sort((a,b)=>a-b));
 await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('Lesson complete'),undefined,{timeout:60000});
 assert(await page.evaluate(()=>window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));assert(await page.locator('#full-lyrics-list').evaluate(el=>el.scrollTop>0));
 await page.goto(base+'/singing-academy');await page.waitForFunction(()=>document.body.innerText.includes('1 of 2 songs complete'));assert.equal(await page.locator('text=✓ Complete').count(),1);
 exercised.push(song);assert.deepEqual(errors,[]);results.push({browser:name,status:'PASS',exercised,progressSurvivesReload:true,demoWithoutMic:true,guide:true,fullLyricsAndCurrentWord:true,lyricsScrollWithinPanel:true,desktopLyricsBesideChart:true,captureDeliveryP95Ms:delays[Math.floor(delays.length*.95)],accessibilityViolations:0,mobileOverflow:false,errors});
 }catch(e){for(const c of browser.contexts())for(const p of c.pages())console.error(await p.locator('body').innerText());throw e;}finally{await browser.close();}
}
await writeFile(output+'/browser.json',JSON.stringify({status:'PASS',scope:'Synthetic microphone through actual capture, pitch detection, timed grading and WASM piano; not physical human singing',results},null,2)+'\n');console.log(JSON.stringify(results));
