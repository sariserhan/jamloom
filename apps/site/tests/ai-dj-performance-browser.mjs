import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import ts from 'typescript';
import {chromium,webkit} from 'playwright';
import {silenceSpeakers} from './silent-audio.mjs';
const source=ts.transpileModule(await readFile('lib/ai-dj-performance.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const folder=resolve(process.argv.includes('--chromium-only')?'../../renders/ai-dj-pipeline-20261024/regression/ai-dj-performance-browser':'../../renders/ai-dj-baseline-20261024');await mkdir(folder,{recursive:true});const results=[];
for(const [name,engine] of (process.argv.includes('--chromium-only')?[['chromium',chromium]]:[['chromium',chromium],['webkit',webkit]])){
 const browser=await engine.launch(process.argv.includes('--chromium-only')?{args:['--disable-audio-output']}:{});try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addInitScript(silenceSpeakers);
 await context.addInitScript(()=>{const Native=window.AudioContext;window.graphs=[];window.AudioContext=class extends Native{constructor(...args){super(...args);this.sources=[];this.meters=[];window.graphs.push(this);}createBufferSource(){const s=super.createBufferSource();this.sources.push(s);return s;}createAnalyser(){const a=super.createAnalyser();this.meters.push(a);return a;}};});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:3000/ai-dj');await page.getByLabel('Party or venue name',{exact:true}).fill('Playback test');
 const rendered=await page.evaluate(async code=>{
  const exports={};new Function('exports',code)(exports);const {PerformanceDeck}=exports;
  const render=async action=>{
   const ctx=new OfflineAudioContext(2,6*8000,8000),buffer=ctx.createBuffer(2,8*8000,8000);
   for(let c=0;c<2;c++){const data=buffer.getChannelData(c);for(let i=0;i<data.length;i++)data[i]=.25*Math.sin(i/8000*(500+i/8000*30));}
   const input=ctx.createGain(),dry=ctx.createGain(),wet=ctx.createGain();wet.gain.value=0;input.connect(dry);dry.connect(ctx.destination);wet.connect(ctx.destination);
   const delays=[1,2,3].map(i=>{const d=ctx.createDelay(2.4),tap=ctx.createGain();d.delayTime.value=.5*i;tap.gain.value=.2/i;input.connect(d);d.connect(tap);tap.connect(wet);return d;});
   const deck=new PerformanceDeck(ctx,buffer,120,input,{dry,wet,delays});deck.play(0);
   if(action?.startsWith('vocal-')){const repeat=action!=='vocal-echo',echo=action!=='vocal-repeat';if(!deck.repeatPhrase(1,1,2,repeat,echo))throw Error('Vocal effect rejected');if(deck.position(5)!==(repeat?3:5))throw Error('Vocal effect moved the timeline incorrectly');if(echo&&!deck.event.label.includes('echo'))throw Error('Echo is missing from deck event');}
   else if(action&&!deck.perform(action,1,'You'))throw Error('Action rejected '+action);
   const out=(await ctx.startRendering()).getChannelData(0);return Array.from(out);
  };
  const baseline=await render(null),report=[];
  for(const action of ['vocal-repeat','vocal-echo','vocal-both','loop-2','loop-4','roll-half','roll-one','cue-1','cue-2','jog-back','jog-forward','backspin','filter','echo']){
   const audio=await render(action);let difference=0,peak=0;
   for(let i=8000;i<40000;i++){if(!Number.isFinite(audio[i]))throw Error('Invalid PCM');difference+=Math.abs(audio[i]-baseline[i]);peak=Math.max(peak,Math.abs(audio[i]));}
   let minimumLevelRatio=1;
   if(action==='roll-one')for(let start=4000;start<24000;start+=800){let power=0,original=0;for(let i=start;i<start+800;i++){power+=audio[i]**2;original+=baseline[i]**2;}minimumLevelRatio=Math.min(minimumLevelRatio,Math.sqrt(power/original));}
   report.push({action,meanDifference:difference/32000,peak,minimumLevelRatio});
  }return report;
 },source);
 for(const row of rendered){assert.ok(row.meanDifference>.001,row.action+' must change actual PCM');assert.ok(row.peak<1,row.action+' must stay bounded');assert.ok(row.minimumLevelRatio>.75,row.action+' must not fade early while its return is scheduled');}
 await startSet(page);await page.waitForFunction(()=>document.querySelector('.deck-0 .aidj-deck-head span').textContent==='PLAYING');
 await page.waitForTimeout(10000);
 assert.equal(await page.locator('.aidj-pads .active').count(),0,'no scheduled automatic moves');
 assert.equal(await page.evaluate(()=>window.graphs[0].sources.length),1,'no automatic source replacement');
 assert.equal(await page.getByRole('button',{name:'Autopilot · baseline',exact:true}).isEnabled(),true);
 await page.getByRole('button',{name:'Deck A ½ roll',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.deck-0 .aidj-pads .active')?.textContent.includes('½ roll'));
 assert.ok(await page.evaluate(()=>window.graphs[0].sources.some(s=>s.loop&&s.buffer.duration<.4)),'real short roll');
 await page.getByRole('button',{name:'Deck A Backspin',exact:true}).waitFor();await page.getByRole('button',{name:'Deck A Backspin',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.deck-0 .aidj-jog.reversing'));
 assert.ok(await page.evaluate(()=>window.graphs[0].sources.some(s=>!s.loop&&s.playbackRate.value===2&&s.buffer.duration<2)),'real reversed slice');
 await page.screenshot({path:resolve(folder,name+'-backspin.png'),fullPage:true});
 await page.getByRole('button',{name:'Deck A Cue 2',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.deck-0 .aidj-jog-display b').textContent==='Cue 2');
 const time=await page.locator('.deck-0 .aidj-clock b').innerText();assert.match(time,/0:0[3-6]/,'cue jumps to eight estimated beats');
 await page.getByLabel('Closing time',{exact:true}).selectOption('track');await page.getByRole('button',{name:'Plan the ending ↘',exact:true}).click();
 const ending=await page.evaluate(()=>{const seconds=text=>text.split(':').map(Number).reduce((n,v)=>n*60+v,0);return{remaining:seconds(document.querySelector('.aidj-topbar').innerText.match(/Finish in (\d+:\d+)/)[1]),position:seconds(document.querySelector('.deck-0 .aidj-clock b').textContent),duration:seconds(document.querySelector('.deck-0 .aidj-clock span').textContent)};});
 assert.ok(Math.abs(ending.remaining-(ending.duration-ending.position))<=2,'After this track follows the actual cue position');
 await page.getByRole('button',{name:'Keep the party going ↗',exact:true}).click();
 await page.getByRole('button',{name:'Deck A Echo',exact:true}).click();await page.waitForFunction(()=>parseInt(document.querySelector('.channel-0 .aidj-fx-readout b').textContent)>10);
 await page.waitForFunction(()=>!document.querySelector('.deck-0 .aidj-pads .active'));
 const wheel=page.getByRole('group',{name:'Deck A jog wheel'});await wheel.scrollIntoViewIfNeeded();const box=await wheel.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+35,box.y+box.height/2,{steps:4});await page.mouse.up();
 await page.waitForFunction(()=>document.querySelector('.deck-0 .aidj-jog-display b').textContent==='Jog +');
 await page.getByRole('button',{name:'Deck A 4 loop',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.deck-0 .aidj-pads .active')?.textContent.includes('4 loop'));
 await page.getByRole('button',{name:'Release deck A performance'}).click();await page.waitForFunction(()=>!document.querySelector('.deck-0 .aidj-pads .active'));
 await page.getByRole('button',{name:'Deck A 4 loop',exact:true}).click();await page.getByRole('button',{name:'■ Stop',exact:true}).click();await page.waitForTimeout(5000);
 assert.ok(await page.evaluate(()=>{const a=window.graphs[0].meters[0],data=new Float32Array(a.fftSize);a.getFloatTimeDomainData(data);return data.every(n=>Math.abs(n)<.00001);}),'scheduled loop return cannot restart after Stop');
 assert.ok(await page.evaluate(()=>window.__jamloomSilentOutput().every(o=>o.peak===0)));
 assert.deepEqual(errors,[]);results.push({browser:name,status:'PASS',rendered,checks:['automatic moves disabled','manual roll and real short buffer','backspin reverse buffer','cue seek and correct after-track ending','echo automation','pointer jog','loop release','stop cancels future return','silent speakers']});console.log(name+' performance PASS');
 }finally{await browser.close();}
}
await writeFile(resolve(folder,'performance-report.json'),JSON.stringify({status:'PASS',results},null,2)+'\n');

async function startSet(page){const remove=page.locator('#set-record-delete');if(await remove.isEnabled())await remove.click();await page.getByRole('button',{name:'Start set'}).click();}
