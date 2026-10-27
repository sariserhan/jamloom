import {chromium,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {revealStudioTools} from '../../web/tests/studio-tools.mjs';
import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:3010',out='/tmp/jamloom-improvements-qa';await mkdir(out,{recursive:true});const results=[];
for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();try{const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 await page.addInitScript(()=>{
  window.__contexts=[];window.__streams=[];window.__mode='tone';
  const Audio=window.AudioContext;window.AudioContext=new Proxy(Audio,{construct(Target,args){const c=new Target(...args);window.__contexts.push(c);return c;}});
  const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(destination,...args){if(destination instanceof AudioDestinationNode){const mute=this.context.createGain();mute.gain.value=0;connect.call(mute,destination);return connect.call(this,mute,...args);}return connect.call(this,destination,...args);};
  if(location.pathname.startsWith('/singing-academy/'))Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{
   if(window.__mode==='denied')throw new DOMException('Denied','NotAllowedError');
   const c=window.__contexts.at(-1),osc=c.createOscillator(),gain=c.createGain(),dest=c.createMediaStreamDestination();osc.frequency.value=440;gain.gain.value=window.__mode==='silence'?0:.2;osc.connect(gain);gain.connect(dest);osc.start();const stream=dest.stream;window.__streams.push(stream);
   for(const t of stream.getTracks()){const stop=t.stop.bind(t);t.stop=()=>{stop();osc.stop();};}
   if(window.__mode==='pending')await new Promise(r=>window.__allow=r);return stream;
  }}});
 });
 await page.goto(base+'/singing-academy/lessons/first-note');await page.waitForSelector('#find-register');assert.match(await page.title(),/Find your note/);
 await page.locator('#find-register').click();await page.waitForFunction(()=>document.querySelector('#register-result').textContent.includes('Starting register'),null,{timeout:20000});assert.equal(await page.locator('#register').inputValue(),'69');assert(await page.evaluate(()=>window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));
 assert.equal(await page.evaluate(()=>localStorage.getItem('jamloom.singing.course.v1')),null);
 for(const width of [1280,390]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(audit.violations.map(v=>v.id),[]);await page.screenshot({path:out+'/'+name+'-register-'+width+'.png',fullPage:true});}
 await page.evaluate(()=>window.__mode='silence');await page.locator('#find-register').click();await page.waitForFunction(()=>document.querySelector('#register-result').textContent.includes('Not enough clear'),null,{timeout:20000});assert.equal(await page.locator('#register').inputValue(),'69');
 await page.evaluate(()=>window.__mode='denied');await page.locator('#find-register').click();await page.waitForFunction(()=>document.querySelector('#feedback').textContent.includes('denied'));assert(await page.locator('#find-register').isEnabled());
 await page.evaluate(()=>window.__mode='pending');await page.locator('#find-register').click();await page.waitForFunction(()=>typeof window.__allow==='function');await page.locator('#stop').click();await page.evaluate(()=>window.__allow());await page.waitForFunction(()=>window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended')));
 const saved={id:'a'.repeat(32),title:'Saved house',artist:'Jamloom Community',kind:'music-dna',mood:'house'};
 await page.evaluate(t=>localStorage.setItem('jamloom-favorites-v1',JSON.stringify([t])),saved);
 await context.route(base+'/api/favorites',r=>r.fulfill({status:401,json:{}}));
 await context.route(base+'/api/taste/song?view=*',r=>r.fulfill({json:{songs:r.request().url().endsWith('public')?[{id:saved.id,title:saved.title,direction:'house'},{id:'b'.repeat(32),title:'New house',direction:'house',created_at:'2026-10-27'},{id:'c'.repeat(32),title:'Fresh jazz',direction:'jazz',created_at:'2026-10-27'}]:[]}}));
 await context.route(base+'/api/improvise/song?view=public',r=>r.fulfill({json:{songs:[]}}));await context.route(base+'/api/ai-dj/sets',r=>r.fulfill({json:{sets:[]}}));await context.route(base+'/api/catalogue',r=>r.fulfill({json:{tracks:[]}}));
 await page.goto(base+'/community');await page.getByLabel(/^Explore/).selectOption('for-you');await page.waitForFunction(()=>document.querySelectorAll('.discovery-grid article').length===2);assert.equal(await page.locator('.discovery-grid h2').first().innerText(),'New house');assert(!await page.locator('.discovery-grid').innerText().then(t=>t.includes('Saved house')));
 for(const width of [1280,390]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+'/'+name+'-discovery-'+width+'.png',fullPage:true});}
 await page.getByLabel('Search music').fill('jazz');assert.equal(await page.locator('.discovery-grid article').count(),1);await page.getByRole('button',{name:'Clear filters',exact:true}).click();assert.equal(await page.locator('.discovery-grid article').count(),2);
 await page.goto(base+'/academy/lessons/first-crossfade');await revealStudioTools(page);await page.locator('#academy-load').click();await page.locator('#academy-check').click();await page.waitForFunction(()=>!document.querySelector('#academy-practice-review').hidden);assert(await page.locator('#academy-practice-items li').count()>0);await page.screenshot({path:out+'/'+name+'-academy-advice.png',fullPage:false});
 await page.goto(base+'/');await page.waitForSelector('h1');for(const img of await page.locator('img[src*="product-previews"]').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>new Promise((resolve,reject)=>{const deadline=Date.now()+10000;const check=()=>{if(i.complete&&i.naturalWidth>0)resolve();else if(Date.now()>deadline)reject(Error('Product image did not load'));else setTimeout(check,50);};check();}));}const images=await page.locator('img[src*="product-previews"]').evaluateAll(list=>list.map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0})));assert(images.length>0);assert(images.every(i=>i.src.endsWith('.webp')&&i.loaded));await page.screenshot({path:out+'/'+name+'-home.png',fullPage:true});
 assert.deepEqual(errors,[]);results.push({browser:name,version:browser.version(),registerTone:'PASS',silence:'PASS',permissionDenial:'PASS',latePermissionCleanup:'PASS',noScoresOrAudioSaved:'PASS',publicDiscovery:'PASS',academyPracticeAdvice:'PASS',viewports:[1280,390],images,errors});
 }finally{await browser.close();}
}
await writeFile(out+'/browser.json',JSON.stringify({results,limitations:['Synthetic microphone; no physical accuracy or vocal range claim','Discovery feeds are fixtures; database isolation tested separately','Browser plugin runtime unavailable; existing Playwright harness used']},null,2));console.log(JSON.stringify(results));
