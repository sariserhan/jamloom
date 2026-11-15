// Home page at desktop and phone widths: axe WCAG AA scan, overflow and page errors (next dev, disposable DB).
// Usage: node --import tsx tests/home-browser.mjs OUT_DIR  (local Postgres on 127.0.0.1:55432)
import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {spawn} from 'node:child_process';import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright';import AxeBuilder from '@axe-core/playwright';
import {createPool} from '../lib/database.ts';import {migrate} from '../lib/migrations.ts';
const out=process.argv[2];const url=new URL('postgres://postgres@127.0.0.1:55432/postgres');
const root=createPool(url.toString()),name='jamloom_home_'+randomUUID().replaceAll('-','');await root.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
const pool=createPool(url.toString());await migrate(pool);const port=4234,base=`http://localhost:${port}`;
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','localhost','--port',String(port)],{cwd:'/Users/serhansari/Documents/projects/jamloom/apps/site',env:{...process.env,NODE_ENV:'development',JAMLOOM_COMING_SOON:'false',DATABASE_URL:url.toString(),BETTER_AUTH_URL:base,BETTER_AUTH_SECRET:randomUUID()+randomUUID(),JAMLOOM_CLOUD_SONGS_ENABLED:'false'},stdio:'ignore'});
try{
 for(let i=0;i<600;i++){try{if((await fetch(base+'/')).status<500)break;}catch{}await delay(200);}
 const browser=await chromium.launch();
 for(const [w,h,label] of [[1440,900,'desktop'],[390,844,'phone']]){
  const context=await browser.newContext({viewport:{width:w,height:h}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/');await page.waitForLoadState('networkidle',{timeout:8000}).catch(()=>{});
  await page.screenshot({path:`${out}/home-${label}-top.png`});await page.screenshot({path:`${out}/home-${label}-full.png`,fullPage:true});
  assert.equal(await page.title(),'Jamloom — AI Song Generator from Your Favorite Music');
  assert.ok((await page.locator('script[type="application/ld+json"]').first().textContent()).includes('"FAQPage"'),'FAQ structured data');
  assert.equal(await page.locator('h1').count(),1);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),height=await page.evaluate(()=>document.documentElement.scrollHeight);
  const a11y=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations.map(v=>v.id+':'+v.nodes.length);
  console.log(label,'height',height,'overflow',overflow,'a11y',JSON.stringify(a11y),'errors',errors.join('|').slice(0,300)||'none');
  await context.close();
 }
 await browser.close();
}finally{server.kill();await pool.end();await root.query(`DROP DATABASE "${name}" WITH (FORCE)`);await root.end();}
