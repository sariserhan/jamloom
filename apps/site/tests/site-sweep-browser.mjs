// Visits every page signed out, as a customer and as the owner (next dev, disposable loopback
// database). Records status, page/console errors, phone-width overflow and axe WCAG AA issues,
// and saves screenshots. Usage:
// JAMLOOM_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres SWEEP_OUT=/tmp/sweep node --import tsx tests/site-sweep-browser.mjs
import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {mkdtemp,readdir,readFile,rm,mkdir,writeFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {spawn} from 'node:child_process';import {setTimeout as delay} from 'node:timers/promises';import {chromium} from 'playwright';import AxeBuilder from '@axe-core/playwright';
import {createPool} from '../lib/database.ts';import {migrate} from '../lib/migrations.ts';import {OWNER_EMAIL} from '../lib/admin-access.ts';import {AdminStore} from '../lib/admin-store.ts';
import {information,guides} from '../lib/editorial.ts';import {academyLevels} from '../lib/academy-content.ts';

const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');
const out=process.env.SWEEP_OUT??join(tmpdir(),'jamloom-sweep');await mkdir(out,{recursive:true});
const root=createPool(url.toString()),name='jamloom_sweep_'+randomUUID().replaceAll('-','');await root.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
const pool=createPool(url.toString()),folder=await mkdtemp(join(tmpdir(),'jamloom-sweep-')),port=4232,base=`http://localhost:${port}`;
const env={...process.env,NODE_ENV:'development',JAMLOOM_COMING_SOON:'false',DATABASE_URL:url.toString(),BETTER_AUTH_URL:base,BETTER_AUTH_SECRET:randomUUID()+randomUUID(),JAMLOOM_LOCAL_OUTBOX:join(folder,'mail'),JAMLOOM_LOCAL_AUDIO_DIR:join(folder,'audio'),CRON_SECRET:randomUUID(),JAMLOOM_CLOUD_SONGS_ENABLED:'false',RUNPOD_API_KEY:''};
const pages=['/','/start','/tour','/music-dna','/improvise','/community','/catalogue','/library','/playlists','/listening','/ai-dj','/ai-dj/session','/ai-dj/sets','/live-dj','/dj-studio','/pro','/academy','/academy/learn','/academy/progress','/academy/checkout','/singing-academy','/singing-academy/warmups','/singing-academy/checkout','/learn','/contact','/support','/report-bug','/account','/account/credits','/account/generations','/account/purchases','/account/sign-in','/account/sign-up',
 ...Object.keys(information).map(k=>'/'+k),...Object.keys(guides).map(k=>'/learn/'+k),...academyLevels.map(l=>'/academy/levels/'+l.slug)];
const adminPages=['/admin','/admin/users','/admin/billing','/admin/inbox','/admin/feedback','/admin/operations'];
let server,logs='';const results=[];
try{
 await migrate(pool);
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','localhost','--port',String(port)],{env,stdio:['ignore','pipe','pipe']});server.stdout.on('data',s=>logs+=s);server.stderr.on('data',s=>logs+=s);
 for(let i=0;i<600;i++){try{if((await fetch(base+'/support')).status<500)break;}catch{}await delay(200);if(i===599)throw Error('Server start timeout\n'+logs);}
 const api=(path,body)=>fetch(base+path,{method:'POST',headers:{origin:base,'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'manual'});
 const mail=async()=>{try{return await Promise.all((await readdir(env.JAMLOOM_LOCAL_OUTBOX)).map(async f=>JSON.parse(await readFile(join(env.JAMLOOM_LOCAL_OUTBOX,f),'utf8'))));}catch{return [];}};
 async function account(email){const password='Local-sweep-test-8462';assert.equal((await api('/api/auth/sign-up/email',{name:'Sweep tester',email,password})).status,200);
  let verify;for(let i=0;i<100&&!verify;i++){verify=(await mail()).find(m=>m.to===email&&m.subject.includes('Verify'));await delay(100);}assert.ok(verify,'verification mail');
  await fetch(verify.text.match(/https?:\/\/\S+/)[0],{redirect:'manual'});const r=await api('/api/auth/sign-in/email',{email,password});assert.equal(r.status,200);return r.headers.getSetCookie().map(s=>s.split(';')[0]);}
 const owner=await account(OWNER_EMAIL),customer=await account('customer@example.test');
 const ownerId=(await pool.query('SELECT id FROM "user" WHERE email=$1',[OWNER_EMAIL])).rows[0].id,customerId=(await pool.query("SELECT id FROM \"user\" WHERE email='customer@example.test'")).rows[0].id;
 await new AdminStore(pool,base).credits(ownerId,customerId,120,{});
 const browser=await chromium.launch();
 try{
  for(const [who,cookie,list] of [['visitor',null,pages],['customer',customer,pages],['owner',owner,adminPages]]){
   const context=await browser.newContext({viewport:{width:1280,height:900}});
   if(cookie)await context.addCookies(cookie.map(v=>({name:v.slice(0,v.indexOf('=')),value:v.slice(v.indexOf('=')+1),url:base})));
   const page=await context.newPage();let errors=[];page.on('pageerror',e=>errors.push('PAGE '+e.message));page.on('console',m=>{if(m.type()==='error'&&!/favicon|Failed to load resource/.test(m.text()))errors.push('CONSOLE '+m.text());});
   for(const path of list){
    errors=[];let status=0,h1=null,overflow=false,a11y=[];
    try{const r=await page.goto(base+path,{timeout:90000});status=r.status();await page.waitForLoadState('networkidle',{timeout:5000}).catch(()=>{});
     h1=await page.locator('h1').first().textContent({timeout:2000}).catch(()=>null);
     const slug=(who+path).replace(/[^a-z0-9]+/gi,'_');
     await page.screenshot({path:join(out,slug+'-desktop.png')});
     await page.setViewportSize({width:390,height:844});await delay(300);overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
     await page.screenshot({path:join(out,slug+'-phone.png'),fullPage:true});await page.setViewportSize({width:1280,height:900});
     a11y=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations.map(v=>`${v.id}(${v.nodes.length}): ${v.nodes.slice(0,2).map(n=>n.target.join(' ')).join(' ; ')}`);
    }catch(e){errors.push('NAV '+e.message.split('\n')[0]);}
    const row={who,path,status,h1:h1?.trim().slice(0,60)??null,overflow,errors:[...new Set(errors)].map(e=>e.slice(0,300)),a11y};results.push(row);
    console.log(`${who} ${path} ${status} ${JSON.stringify(row.h1)}${overflow?' OVERFLOW':''}${row.errors.length?' ERR '+row.errors.join(' | ').slice(0,400):''}${a11y.length?' A11Y '+a11y.join(' | ').slice(0,400):''}`);
   }
   await context.close();
  }
 }finally{await browser.close();}
}finally{server?.kill();await writeFile(join(out,'results.json'),JSON.stringify(results,null,1));await pool.end();await root.query(`DROP DATABASE "${name}" WITH (FORCE)`);await root.end();await rm(folder,{recursive:true,force:true});
 const serverErrors=[...new Set(logs.split('\n').filter(l=>/⨯|Error:|error/i.test(l)&&!/sslmode|DeprecationWarning/.test(l)))].slice(0,40).join('\n');if(serverErrors)console.log('--- server log errors ---\n'+serverErrors);}
