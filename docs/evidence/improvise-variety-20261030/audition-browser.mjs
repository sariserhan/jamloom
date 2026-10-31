import {chromium} from '../../../apps/site/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--autoplay-policy=no-user-gesture-required']});
const views=[];
try {
  for(const width of [1280,390]) {
    const page=await browser.newPage({viewport:{width,height:844}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:8777/neural-variety/');
    await page.waitForFunction(()=>{const a=[...document.querySelectorAll('audio')];return a.length===5&&a[0].duration===1.22&&a.slice(1).every(x=>x.duration===45)});
    assert.equal(await page.locator('h1').innerText(),'Three musical directions');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    for(const i of [0,1,2,3,4]) {
      const audio=page.locator('audio').nth(i);
      await audio.evaluate(async a=>{a.volume=0;await a.play()});
      await page.waitForFunction(i=>document.querySelectorAll('audio')[i].currentTime>.1,i);
      await audio.evaluate(a=>{a.pause();a.currentTime=a.duration/2});
      await page.waitForFunction(i=>{const a=document.querySelectorAll('audio')[i];return !a.seeking&&a.currentTime===a.duration/2&&!a.error},i);
    }
    await page.locator('audio').nth(1).evaluate(async a=>{a.currentTime=0;await a.play()});
    await page.locator('audio').nth(0).evaluate(async a=>{a.currentTime=0;await a.play()});
    assert.equal(await page.locator('audio').nth(1).evaluate(a=>a.paused),true);
    await page.locator('audio').nth(0).evaluate(a=>a.pause());
    for(const button of await page.locator('[data-player]').all()) {
      const id=await button.getAttribute('data-player'),seconds=Number(await button.getAttribute('data-seconds'));
      await button.click();
      await page.waitForFunction(({id,seconds})=>{const a=document.getElementById(id);return a.currentTime>=seconds&&!a.paused&&!a.error},{id,seconds});
      await page.locator('#'+id).evaluate(a=>a.pause());
    }
    assert.equal(await page.locator('a[download]').count(),3);
    assert.deepEqual(errors,[]);
    await page.screenshot({path:`/tmp/jamloom-neural-variety-${width}.png`,fullPage:true});
    views.push({width,durations:[1.22,45,45,45,45],playback:true,seek:true,exclusivePlayback:true,phraseJump:true,overflow:false,errors});
    await page.close();
  }
  await writeFile('docs/evidence/improvise-variety-20261030/audition-browser.json',JSON.stringify({status:'PASS',views,ownerListening:'NOT RUN; automated playback only'},null,2)+'\n');
  console.log('PASS variety auditions desktop/mobile playback and seek');
} finally {await browser.close()}
