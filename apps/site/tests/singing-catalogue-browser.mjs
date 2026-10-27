import {chromium,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {singingSongs} from '../../web/singing-course.js';
const base=process.env.SINGING_BASE_URL||'http://127.0.0.1:3010',output=process.env.SINGING_EVIDENCE_DIR||'/tmp/jamloom-free-songs-qa';
assert.equal(new URL(base).hostname,'127.0.0.1');await mkdir(output,{recursive:true});const results=[];
for(const[name,type]of[['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();try{const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
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

 await page.goto(base+'/singing-academy');await page.waitForFunction(n=>document.querySelectorAll('#course h3').length===n,singingSongs.length);assert.match(await page.title(),/Singing Academy/);
 for(const width of[1280,390]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(audit.violations.map(v=>v.id),[]);await page.screenshot({path:output+'/'+name+'-catalogue-'+width+'.png',fullPage:true});}
 await page.goto(base+'/singing-academy/checkout');assert.match(await page.getByRole('heading',{name:/39 USD/}).innerText(),/39 USD/);assert.match(await page.locator('body').innerText(),/12 practice songs/);
 const checked=[];
 for(const id of['frere-jacques','ode-to-joy','paper-kites','neon-tide']){
  console.log(name,id);const song=singingSongs.find(s=>s.id===id);
  assert.equal((await page.goto(base+'/singing-academy/lessons/'+id)).status(),200);await page.waitForSelector('#full-lyrics-list span');assert.equal(await page.locator('#lesson-title').innerText(),song.title);
  assert.equal(await page.locator('#full-lyrics-list span').count(),song.lyrics.filter(Boolean).length);
  await page.locator('#demo').click();await page.waitForFunction(()=>{const a=window.__pianoMeter;if(!a)return false;const samples=new Float32Array(a.fftSize);a.getFloatTimeDomainData(samples);return samples.some(v=>Math.abs(v)>.0001)});assert.equal(await page.evaluate(()=>window.__streams.length),0);await page.locator('#stop').click();assert(await page.evaluate(()=>window.__contexts.every(c=>c.state==='closed')));
  await page.selectOption('#section','0');await page.evaluate(async id=>{const m=await import('/studio/singing-course.js'),l=m.lessonById(id),phrase=m.phraseFor(l,57,l.tempo,0);window.__exercise={song:true,phrase,duration:phrase.at(-1).at+phrase.at(-1).duration,tempo:l.tempo};},id);
  await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#full-lyrics-list .current-word'));assert.equal(await page.locator('#full-lyrics-list .current-word').innerText(),await page.locator('#lyrics').innerText());
  if(id==='frere-jacques'){await page.waitForFunction(()=>document.querySelector('#lyrics').textContent==='Jacques');await page.waitForTimeout(650);assert.equal(await page.locator('#full-lyrics-list .current-word').innerText(),'Jacques');}
  if(id==='ode-to-joy')await page.screenshot({path:output+'/'+name+'-singing-mobile.png',fullPage:true});
  await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('Section complete'),null,{timeout:30000});assert(await page.evaluate(()=>window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));assert(await page.evaluate(id=>!JSON.parse(localStorage.getItem('jamloom.singing.course.v1')||'{}')[id],id));checked.push({id,heardRealWasm:true,wholeWords:true,syntheticSectionPassed:true,micStopped:true});
 }
 const fullId=name==='chromium'?'ode-to-joy':'frere-jacques';await page.goto(base+'/singing-academy/lessons/'+fullId);await page.waitForSelector('#start');
 await page.evaluate(async id=>{const m=await import('/studio/singing-course.js'),l=m.lessonById(id),phrase=m.phraseFor(l,57,l.tempo);window.__exercise={song:true,phrase,duration:phrase.at(-1).at+phrase.at(-1).duration,tempo:l.tempo};localStorage.setItem(m.progressKey,JSON.stringify({'city-lights':{best:91,attempts:2,passed:true}}));},fullId);
 await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('Lesson complete'),null,{timeout:65000});await page.reload();await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('Previously completed'));assert(await page.evaluate(()=>JSON.parse(localStorage.getItem('jamloom.singing.course.v1'))['city-lights'].best===91));
 assert.deepEqual(errors,[]);results.push({browser:name,version:browser.version(),catalogueCount:singingSongs.length,viewports:[1280,390],automatedAccessibility:'PASS',newSongs:checked,fullSongCompleted:fullId,progressReloadAndOldScores:'PASS',errors});
 }finally{await browser.close();}}
await writeFile(output+'/browser.json',JSON.stringify({status:'PASS',method:'Built local site, actual WASM playback and synthetic singing through microphone worklet; no physical singer or phone qualification',results},null,2)+'\n');console.log(JSON.stringify(results));
