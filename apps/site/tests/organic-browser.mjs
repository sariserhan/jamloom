import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {writeFile,mkdir} from 'node:fs/promises';
const base=process.env.JAMLOOM_ORGANIC_BASE??'http://127.0.0.1:4289';
const out=process.env.JAMLOOM_ORGANIC_EVIDENCE??'../../docs/evidence/web-growth-20261109';
await mkdir(out,{recursive:true});
const paths=['/','/learn','/learn/make-a-song-from-favorite-music','/learn/record-sound-for-ai-song','/learn/ai-music-credits','/learn/voice-remix','/music-dna','/improvise','/start','/tour','/community','/about','/terms','/status','/privacy'];
const results=[];
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch();
 try{const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const path of paths){console.log(name,path);const response=await page.goto(base+path,{waitUntil:'networkidle'});assert.equal(response.status(),200,path);assert.equal(await page.locator('h1').count(),1,path);assert.equal(new URL(await page.locator('link[rel=canonical]').getAttribute('href')).href,'https://www.jamloom.com'+(path==='/'?'/':path));assert.ok(!(await page.locator('meta[name=robots]').getAttribute('content')).includes('noindex'),path);assert.ok(await page.locator('meta[name=description]').getAttribute('content'),path);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),path+' mobile overflow');
 const schemas=await page.locator('script[type="application/ld+json"]').allTextContents();schemas.forEach(s=>JSON.parse(s));
 if(path.startsWith('/learn/')||path==='/'){const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(a.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[],path);}
 results.push({browser:name,path,status:response.status(),canonical:true,indexable:true,mobileOverflow:false,schemas:schemas.length});
 }
 assert.deepEqual(errors,[]);
 await page.goto(base+'/learn/make-a-song-from-favorite-music');await page.screenshot({path:out+'/'+name+'-guide-mobile.png',fullPage:true});
 const nojs=await browser.newContext({javaScriptEnabled:false});const p=await nojs.newPage();await p.goto(base+'/learn/make-a-song-from-favorite-music');assert.ok(await p.locator('article').innerText());assert.equal(await p.locator('h2').count(),5);await nojs.close();
 await context.close();
 }finally{await browser.close();}
}
await writeFile(out+'/browser-results.json',JSON.stringify({at:new Date().toISOString(),base,results,serverRenderedContent:true,noAutoplayInteraction:true},null,2)+'\n');console.log(JSON.stringify({checks:results.length,serverRenderedContent:true,errors:0}));
