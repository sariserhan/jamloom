import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {emptyTaste} from '../lib/taste.ts';
import {silenceSpeakers} from './silent-audio.mjs';
const base=process.env.JAMLOOM_TEST_URL??'http://127.0.0.1:3010';
assert.equal(new URL(base).hostname,'127.0.0.1');
const evidence=new URL(process.env.JAMLOOM_EVIDENCE_DIR??'../../../docs/evidence/web-followup-20261027/',import.meta.url),results=[];
await mkdir(evidence,{recursive:true});
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch(name==='chromium'?{args:['--mute-audio']}:{});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addInitScript(silenceSpeakers);
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  await context.addInitScript(()=>{window.deckPaints=0;const stroke=CanvasRenderingContext2D.prototype.stroke;CanvasRenderingContext2D.prototype.stroke=function(...args){if(this.canvas.classList.contains('deck-scope'))window.deckPaints++;return stroke.apply(this,args);};});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/');const deck=page.getByRole('region',{name:'Try the DJ decks'});await deck.scrollIntoViewIfNeeded();await page.waitForTimeout(250);
  const paints=async()=>{const before=await page.evaluate(()=>window.deckPaints);await page.waitForTimeout(2000);return await page.evaluate(()=>window.deckPaints)-before;};
  const idle=await paints();assert.equal(idle,0);
  await deck.getByRole('button',{name:'Play Deck A',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.mini-deck audio').currentTime>.2);
  const active=await paints();assert.ok(active>10);
  await deck.getByRole('slider',{name:'Mini deck crossfader'}).fill('0.4');await deck.getByRole('slider',{name:'Mini deck master volume'}).fill('0.3');assert.equal(await deck.locator('output').innerText(),'30%');
  await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));await page.waitForTimeout(250);
  const time=await deck.locator('audio').first().evaluate(a=>a.currentTime),offscreen=await paints();assert.equal(offscreen,0);assert.ok(await deck.locator('audio').first().evaluate(a=>a.currentTime)>time+1);
  await deck.scrollIntoViewIfNeeded();await page.waitForTimeout(250);assert.ok(await paints()>10);
  await deck.getByRole('button',{name:'Pause Deck A',exact:true}).click();await page.waitForTimeout(250);assert.equal(await paints(),0);
  await deck.getByRole('button',{name:'Cue Deck A',exact:true}).click();assert.equal(await deck.locator('audio').first().evaluate(a=>a.currentTime),0);
  await page.screenshot({path:new URL(name+'-deck.png',evidence).pathname});

  const profile={...emptyTaste,references:Array.from({length:5000},(_,i)=>`Unknown song ${i} — Test artist`)};
  await page.evaluate(p=>localStorage.setItem('jamloom-taste-v1',JSON.stringify(p)),profile);
  let searches=0;const quotes=[],submissions=[];
  await page.route('**/api/music-search',async route=>{searches++;const query=route.request().postDataJSON().query;const reference=query.replace(' Test artist',' — Test artist');await route.fulfill({json:{suggestions:[{reference,metadata:{reference,genre:'Jazz',source:'itunes'}}]}});});
  await page.route('**/api/taste/song*',async route=>{
   if(route.request().method()==='GET')return route.fulfill({json:{mode:'local',signedIn:true,creditsEnabled:true}});
   const body=route.request().postDataJSON();
   if(body.action==='quote'){quotes.push(body);return route.fulfill({json:{credits:3,token:'local-quote-fixture',expiresAt:Date.now()+60000}});}
   submissions.push(body);await route.fulfill({status:409,json:{error:'Qualification stopped before generation'}});
  });
  await page.goto(base+'/music-dna');await page.getByRole('button',{name:'Make my music',exact:true}).click();
  await page.getByRole('button',{name:'Generate song · 1 credit',exact:true}).click();
  await page.getByRole('button',{name:'Generate song · 3 credits',exact:true}).waitFor();assert.equal(quotes.length,1);assert.equal(searches,12);assert.equal(quotes[0].profile.references.length,5000);assert.equal(quotes[0].profile.referenceMetadata.length,12);
  await page.getByRole('button',{name:'Generate song · 3 credits',exact:true}).click();await page.getByText('Qualification stopped before generation',{exact:true}).waitFor();
  assert.equal(submissions.length,1);assert.equal(quotes.length,1);assert.equal(searches,12);assert.deepEqual(submissions[0].profile,quotes[0].profile);assert.equal(submissions[0].token,'local-quote-fixture');
  await Promise.all([page.waitForResponse(r=>r.request().method()==='POST'&&r.url()===base+'/api/taste/song'),page.getByRole('button',{name:'Generate song · 3 credits',exact:true}).click()]);
  await page.waitForTimeout(200);assert.equal(submissions.length,2);assert.equal(submissions[1].requestId,submissions[0].requestId,'Retry preserves idempotency');
  await page.getByRole('radio',{name:'Private · from 2 credits',exact:true}).check();await page.getByRole('button',{name:'Generate song · 2 credits',exact:true}).click();await page.getByRole('button',{name:'Generate song · 3 credits',exact:true}).waitFor();assert.equal(quotes.length,2);assert.equal(quotes[1].visibility,'private');assert.equal(quotes[1].publicConsent,false);assert.equal(submissions.length,2,'A changed private quote needs new confirmation');
  assert.deepEqual(errors,[]);results.push({browser:name,idlePaintsInTwoSeconds:idle,activePaintsInTwoSeconds:active,offscreenPaintsInTwoSeconds:offscreen,offscreenAudioContinues:'PASS',pauseCueMixer:'PASS',favorites:5000,metadataLookups:12,privateQuoteInvalidation:'PASS',quoteConfirmationAndRetry:'PASS',realGeneration:'NOT RUN: intercepted API, no credits or provider used'});
 }finally{await browser.close();}
}
await writeFile(new URL('browser.json',evidence),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
