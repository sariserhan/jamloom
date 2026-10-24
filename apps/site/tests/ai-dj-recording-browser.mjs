// Actual compressed capture; synthetic audio is engineering evidence only.
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {chromium,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {silenceSpeakers} from './silent-audio.mjs';
const folder=resolve('../../renders/ai-dj-recording-20261024');await mkdir(folder,{recursive:true});const results=[];
function fixture(){const rate=16000,frames=12*rate,b=Buffer.alloc(44+frames*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(frames*2,40);for(let i=0;i<frames;i++)b.writeInt16LE(Math.round(.2*Math.sin(2*Math.PI*220*i/rate)*32767),44+i*2);return b;}
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch();try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});await context.addInitScript(silenceSpeakers);
  await context.addInitScript(()=>{const Native=AudioContext;window.audioContexts=[];window.AudioContext=class extends Native{constructor(...args){super(...args);window.audioContexts.push(this);}};window.micCalls=0;navigator.mediaDevices.getUserMedia=()=>{window.micCalls++;throw Error('Microphone must not be used');};});
  const page=await context.newPage(),errors=[],consoleErrors=[],navigationAborts=[];let navigating=false;page.on('pageerror',e=>{if(name==='webkit'&&navigating&&e.message==='/localhost:3000/api/site-status due to access control checks.')navigationAborts.push(e.message);else errors.push(e.message);});page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});page.setDefaultTimeout(20000);
  await page.goto('http://localhost:3000/ai-dj');assert.match(await page.title(),/Jamloom/);await page.getByRole('heading',{name:'Record your set',exact:true}).waitFor();
  const record=page.locator('#set-record-start'),finish=page.locator('#set-record-stop'),remove=page.locator('#set-record-delete'),consent=page.locator('#set-record-consent');
  assert.ok(await record.isDisabled());await consent.check();assert.ok(await record.isDisabled());
  await page.getByText('Tracks & mix-point review',{exact:true}).click();for(const title of ['Party Sector','Black Diamond'])await page.getByRole('button',{name:'Remove '+title,exact:true}).click();
  await page.getByLabel(/I have permission to process/).check();await page.getByLabel('Add local tracks',{exact:true}).setInputFiles({name:'recording-fixture.wav',mimeType:'audio/wav',buffer:fixture()});await page.getByText('1 tracks added. Files stay on this device.',{exact:true}).waitFor();
  const start=page.getByRole('button',{name:'Start set',exact:false}),pause=page.getByRole('button',{name:'Pause',exact:true});
  const ready=()=>page.waitForFunction(()=>!document.querySelector('#set-record-start').disabled);
  const capturing=()=>page.getByText(/Recording private set/).waitFor();
  await start.click();await ready();assert.ok(await finish.isDisabled());await record.click();await capturing();await page.waitForTimeout(1800);
  await pause.click();await page.getByRole('button',{name:'Resume',exact:true}).waitFor();await page.locator('#set-record-download').waitFor();
  const receipt=await page.locator('#set-record-details').evaluate(async a=>(await fetch(a.href)).json());
  const download=page.waitForEvent('download');await page.locator('#set-record-download').click();const saved=await download,bytes=await readFile(await saved.path());
  assert.equal(createHash('sha256').update(bytes).digest('hex'),receipt.sha256);assert.ok(receipt.seconds>=1&&receipt.seconds<6);assert.equal(receipt.bytes,bytes.length);assert.equal(receipt.gaps,0);
  const pcm=await page.locator('#set-record-player').evaluate(async a=>{const c=new AudioContext();try{const b=await c.decodeAudioData(await(await fetch(a.src)).arrayBuffer());let power=0,peak=0;for(const v of b.getChannelData(0)){power+=v*v;peak=Math.max(peak,Math.abs(v));}return {seconds:b.duration,channels:b.numberOfChannels,rms:Math.sqrt(power/b.length),peak};}finally{await c.close();}});
  assert.equal(pcm.channels,2);assert.ok(pcm.rms>.005&&pcm.peak<1);assert.ok(Math.abs(pcm.seconds-receipt.seconds)<1);
  await writeFile(resolve(folder,name+'-take.'+(receipt.mime.includes('mp4')?'m4a':'webm')),bytes);await page.screenshot({path:resolve(folder,name+'-desktop.png'),fullPage:true});
  for(const width of [390,320]){await page.setViewportSize({width,height:844});await page.locator('.aidj-recording').scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:resolve(folder,name+'-'+width+'.png')});}
  assert.deepEqual((await new AxeBuilder({page}).include('.aidj-recording').withTags(['wcag2a','wcag2aa']).analyze()).violations,[]);
  await page.getByRole('button',{name:'■ Stop',exact:true}).click();assert.ok(await page.locator('#set-record-download').isVisible());await consent.uncheck();assert.ok(await page.locator('#set-record-download').isHidden());assert.equal(await page.locator('#set-record-player').getAttribute('src'),null);
  await consent.check();await start.click();await ready();
  await page.evaluate(()=>{window.originalCodecSupport=MediaRecorder.isTypeSupported;MediaRecorder.isTypeSupported=()=>false;});await record.click();await page.getByText(/Long recordings are unavailable/).waitFor();assert.ok(await pause.isEnabled());await page.evaluate(()=>{MediaRecorder.isTypeSupported=window.originalCodecSupport;});
  await record.click();await capturing();await page.waitForTimeout(1100);await consent.uncheck();await page.getByText('Recording permission removed. Set discarded.',{exact:true}).waitFor();assert.ok(await page.locator('#set-record-download').isHidden());assert.ok(await pause.isEnabled());
  await consent.check();await record.click();await capturing();await page.waitForTimeout(1100);await page.getByRole('button',{name:'■ Stop',exact:true}).click();await page.locator('#set-record-download').waitFor();
  await remove.click();await start.click();await ready();await record.click();await capturing();await page.getByText('Library finished. Add more tracks to continue.',{exact:true}).waitFor();await page.locator('#set-record-download').waitFor();
  await remove.click();await start.click();await ready();await record.click();await capturing();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await page.getByText('Audio or page visibility interrupted. Incomplete set discarded.',{exact:true}).waitFor();assert.ok(await page.locator('#set-record-download').isHidden());await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});});
  await start.click();await ready();await record.click();await capturing();await page.evaluate(async()=>{for(const c of window.audioContexts)if(c.state==='running')await c.suspend();});await page.getByText('Audio or page visibility interrupted. Incomplete set discarded.',{exact:true}).waitFor();assert.ok(await page.locator('#set-record-download').isHidden());
  assert.equal(await page.getByLabel('Session length',{exact:true}).count(),0);assert.ok(await page.getByText('Playback test · local tracks',{exact:true}).isVisible());assert.deepEqual(consoleErrors.filter(m=>!/^\/localhost:3000\/api\/site-status due to access control checks\.$/.test(m)),[]);assert.equal((await context.request.get('http://localhost:3000/api/site-status')).status(),200);
  assert.equal(await page.evaluate(()=>window.micCalls),0);assert.ok(await page.evaluate(()=>window.__jamloomSilentOutput().every(o=>o.peak===0)));assert.deepEqual(errors,[]);
  navigating=true;await page.locator('.aidj-notes summary').click();await page.locator('a[href="/dj-studio"]').last().click();await page.waitForURL('**/dj-studio');await page.goBack();await page.getByRole('heading',{name:'Record your set',exact:true}).waitFor();assert.ok(await page.locator('#set-record-start').isDisabled());assert.deepEqual(errors,[]);
  // The same recorder must still work in the existing Studio/Academy host.
  await page.setViewportSize({width:1440,height:1000});await page.goto('http://localhost:3000/academy/lessons/first-crossfade');
  await page.locator('details.studio-panel, details.studio-options, details.deck-tools').evaluateAll(rows=>rows.forEach(n=>n.open=true));
  await page.locator('#academy-load').click();await page.locator('#academy-check').waitFor({state:'visible'});await page.locator('#play-a').click();
  await page.locator('#set-record-consent').check();await page.locator('#set-record-start').click();await page.waitForFunction(()=>!document.querySelector('#set-record-stop').disabled);await page.waitForTimeout(1200);await page.locator('#set-record-stop').click();await page.locator('#set-record-download').waitFor();
  const legacyDownload=page.waitForEvent('download');await page.locator('#set-record-details').click();const legacy=JSON.parse(await readFile(await(await legacyDownload).path(),'utf8'));assert.ok(legacy.seconds>1&&legacy.bytes>1000);await page.locator('#set-record-consent').uncheck();assert.ok(await page.locator('#set-record-download').isHidden());assert.deepEqual(errors,[]);
  results.push({browser:name,status:'PASS',receipt,decoded:pcm,legacyStudioReceipt:legacy,checks:['consent and playing gate','actual compressed capture','download SHA-256 and decoded PCM','pause finalizes','stop and natural end finalize','withdrawal removes take without stopping playback','unsupported codec recovery','hidden/audio interruption','no finite product session selector','route cleanup','no microphone','speakers muted','390/320px layout','scoped Axe','existing Studio/Academy recorder'],errors,aiDJConsoleErrors:consoleErrors,navigationAborts});console.log(name+' recording PASS');
 }finally{await browser.close();}
}
await writeFile(resolve(folder,'report.json'),JSON.stringify({status:'PASS technical',human_listening:'NOT RUN',results},null,2)+'\n');
