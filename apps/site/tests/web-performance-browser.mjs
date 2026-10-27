import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.JAMLOOM_TEST_URL??'http://127.0.0.1:3010',evidence=new URL(process.env.JAMLOOM_EVIDENCE_DIR??'../../../docs/evidence/web-followup-20261027/',import.meta.url);
assert.equal(new URL(base).hostname,'127.0.0.1');await mkdir(evidence,{recursive:true});
const browser=await chromium.launch({headless:true}),rows=[];
for(const route of ['/','/community','/improvise','/music-dna','/singing-academy','/pricing']){
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__perf={lcp:0,cls:0,long:0};for(const type of ['largest-contentful-paint','layout-shift','longtask'])try{new PerformanceObserver(list=>{for(const e of list.getEntries()){if(type==='largest-contentful-paint')window.__perf.lcp=e.startTime;if(type==='layout-shift'&&!e.hadRecentInput)window.__perf.cls+=e.value;if(type==='longtask')window.__perf.long+=e.duration;}}).observe({type,buffered:true});}catch{}});
 await page.goto(base+route,{waitUntil:'networkidle'});await page.waitForTimeout(600);
 const before=await page.evaluate(()=>({title:document.title,heading:document.querySelector('h1')?.textContent,...window.__perf,requests:performance.getEntriesByType('resource').map(e=>({url:new URL(e.name).pathname,kind:e.initiatorType,bytes:e.transferSize,decoded:e.decodedBodySize,duration:e.duration})),overflow:document.documentElement.scrollWidth>innerWidth}));
 await page.screenshot({path:new URL('mobile-'+(route==='/'?'home':route.slice(1))+'.png',evidence).pathname});
 assert.deepEqual(errors,[]);assert.equal(before.overflow,false);assert.equal(before.requests.filter(r=>['audio','video'].includes(r.kind)).length,0);rows.push({route,errors,...before});await context.close();
}
await browser.close();await writeFile(new URL('performance-after.json',evidence),JSON.stringify(rows,null,2));console.log(JSON.stringify(rows.map(r=>({route:r.route,lcp:r.lcp,cls:r.cls,long:r.long,bytes:r.requests.reduce((s,x)=>s+x.bytes,0),requests:r.requests.length,largest:r.requests.toSorted((a,b)=>b.bytes-a.bytes).slice(0,4),errors:r.errors,overflow:r.overflow})),null,2));
