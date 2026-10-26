import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const fresh=process.argv.includes('--fresh-flow'),count=fresh?13:10;
const folder=new URL('../../../docs/evidence/continuity-followthrough-20261026/',import.meta.url),rows=[];
for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();try{
  const page=await browser.newPage({viewport:{width:name==='webkit'?390:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8766/'+(fresh?'fresh-flow':'continuity')+'/review/');if(fresh)await page.locator('summary').click();assert.equal(await page.locator('audio').count(),count);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  for(let i=0;i<count;i++){
   await page.locator('audio').nth(i).evaluate(a=>{a.muted=true;return a.play();});
   await page.waitForFunction(i=>document.querySelectorAll('audio')[i].currentTime>.2,i);
   assert.equal(await page.evaluate(()=>[...document.querySelectorAll('audio')].filter(a=>!a.paused).length),1);
   await page.locator('audio').nth(i).evaluate(a=>a.currentTime=20);
   await page.waitForFunction(i=>{const a=document.querySelectorAll('audio')[i];return !a.seeking&&a.currentTime>=20;},i);
   await page.locator('audio').nth(i).evaluate(a=>a.pause());
  }
  assert.deepEqual(errors,[]);await page.screenshot({path:new URL((fresh?'fresh-flow':'continuity')+'-'+name+'.png',folder).pathname,fullPage:true});rows.push({browser:name,players:count,playSeekAndExclusivePlayback:true,overflow:false,errors});
 }finally{await browser.close();}
}
await writeFile(new URL(fresh?'fresh-review-browser.json':'review-browser.json',folder),JSON.stringify({status:'PASS',rows},null,2)+'\n');console.log('PASS: Chromium and WebKit playback, seeking, exclusive playback and layout');
