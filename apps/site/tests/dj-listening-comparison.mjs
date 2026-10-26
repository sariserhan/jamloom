// Browser plugin's Node REPL runtime is unavailable; use the previously authorized muted Playwright fallback.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {silenceSpeakers} from './silent-audio.mjs';
const vocalEffects=process.argv.includes('--vocal-effects'),guided=process.argv.includes('--guided-set'),timing=process.argv.includes('--timing-revision');assert.ok(!timing||guided);
const quality=process.argv.includes('--quality'),originals=process.argv.includes('--originals'),house=process.argv.includes('--house-study'),blind=process.argv.includes('--blind'),composition=process.argv.includes('--composition');
assert.ok([house,quality,composition,vocalEffects,guided].filter(Boolean).length<=1,'Choose one campaign');assert.ok(!blind||house||composition||guided,'Blind requires a paired study');
assert.ok(!originals||quality,'Originals belongs to the quality campaign');
const folder=(vocalEffects||guided)?'../../docs/evidence/dj-guided-set-20261025':composition?'../../docs/evidence/dj-composition-20261025':house?'../../docs/evidence/dj-house-consistency-20261025':quality?'../../docs/evidence/dj-quality-20261025':'../../docs/evidence/dj-audible-comparison-20261025',results=[],count=guided?(blind?6:1):composition?(blind?4:2):house?(blind?6:1):quality?(originals?6:2):4;
const suffix=guided?(blind?'-originals':timing?'-timing-mix':'-mix'):vocalEffects?'-vocals':composition?(blind?'-originals':'-guides'):house?(blind?'-blind':'-mix'):originals?'-originals':'';
await mkdir(folder,{recursive:true});
for(const [name,engine] of Object.entries({chromium,webkit})){
 const browser=await engine.launch();
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addInitScript(silenceSpeakers);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8766/'+(guided?(blind?'guided-originals':timing?'guided-performance':'guided-mix'):vocalEffects?'vocal-effects':composition?(blind?'composition-originals':'composition-guides'):house?(blind?'house-blind':'house-mix'):quality?(originals?'quality-originals':'quality-comparison'):'audible-comparison')+'/review/');assert.equal(await page.locator('audio').count(),count);
  assert.match(await page.title(),/Jamloom/);assert.ok(await page.locator('h1').innerText());
  await page.waitForFunction(min=>[...document.querySelectorAll('audio')].every(a=>Number.isFinite(a.duration)&&a.duration>min),vocalEffects?10:50);
  assert.ok(await page.locator('audio').evaluateAll(nodes=>nodes.every(a=>a.paused&&!a.autoplay)));
  if(blind){
   assert.deepEqual(await page.locator('audio').evaluateAll(nodes=>nodes.map(a=>a.getAttribute('src'))),Array.from({length:count},(_,i)=>`clip-${i+1}.mp3`));
   assert.doesNotMatch(await page.locator('body').innerText(),/261025|271025|281025|291025|301025|focused|control/i);
   assert.equal((await page.request.get(new URL('blind-key.json',page.url()).href)).status(),404);
  }
  const clips=[];
  for(let i=0;i<count;i++){
   const clip=page.locator('audio').nth(i);
   await clip.evaluate(async a=>{await a.play();});
   await page.waitForFunction(i=>document.querySelectorAll('audio')[i].currentTime>.15,i);
   assert.equal(await page.locator('audio').evaluateAll(nodes=>nodes.filter(a=>!a.paused).length),1);
   await clip.evaluate((a,t)=>{a.currentTime=t;},vocalEffects?6:30);
   await page.waitForFunction(({i,t})=>{const a=document.querySelectorAll('audio')[i];return !a.seeking&&a.currentTime>=t},{i,t:vocalEffects?6:30});
   clips.push(await clip.evaluate(a=>({label:a.getAttribute('aria-label'),seconds:a.duration,error:a.error?.code??null})));
  }
  await page.locator('audio').evaluateAll(nodes=>nodes.forEach(a=>a.pause()));
  if(composition&&!blind){
   for(let i=0;i<count;i++){
    const article=page.locator('article').nth(i),clip=article.locator('audio');
    assert.equal(await article.locator('option').count(),6);
    await article.locator('select').selectOption({label:'Hook'});
    await page.waitForFunction(i=>{const a=document.querySelectorAll('audio')[i];return a.readyState>=1&&a.currentTime>=30},i);
    assert.ok(await clip.evaluate(a=>a.paused));await clip.evaluate(a=>a.play());
    await page.waitForFunction(i=>document.querySelectorAll('audio')[i].currentTime>30.1,i);
    await clip.evaluate(a=>a.pause());await article.getByRole('button',{name:'Return',exact:true}).click();
    assert.ok(await clip.evaluate(a=>a.currentTime>40&&a.currentTime<50));
    for(const label of ['Kick','Drums','Bass','Chords','Full mix']){
     await article.locator('select').selectOption({label});
     await page.waitForFunction(i=>document.querySelectorAll('audio')[i].readyState>=1,i);
     assert.ok(await clip.evaluate(a=>a.paused&&a.duration>59&&!a.error));
    }
   }
  }
  await page.screenshot({path:folder+'/'+name+suffix+'-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:folder+'/'+name+suffix+'-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);assert.ok(clips.every(c=>c.error===null));results.push({engine:name,status:'PASS',clips,errors});
 }finally{await browser.close();}
}
await writeFile(folder+'/browser'+suffix+'.json',JSON.stringify({results,speakerOutput:'Muted',humanListening:'NOT RUN'},null,2)+'\n');
console.log(`PASS: ${count} clips play and seek; one at a time; Chromium/WebKit; desktop/mobile.`);
