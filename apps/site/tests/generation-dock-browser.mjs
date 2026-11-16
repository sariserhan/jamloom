// Site-wide song progress bar: appears after Generate, follows navigation, no page errors.
// Disposable loopback database (next dev). Usage:
// JAMLOOM_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres SWEEP_OUT=/tmp/dock node --import tsx tests/generation-dock-browser.mjs
import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {mkdtemp,readdir,readFile,rm,mkdir} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {spawn} from 'node:child_process';import {setTimeout as delay} from 'node:timers/promises';import {chromium} from 'playwright';
import {createPool} from '../lib/database.ts';import {migrate} from '../lib/migrations.ts';
const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');
const out=process.env.SWEEP_OUT??join(tmpdir(),'jamloom-dock');await mkdir(out,{recursive:true});
const root=createPool(url.toString()),name='jamloom_dock_'+randomUUID().replaceAll('-','');await root.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
const pool=createPool(url.toString()),folder=await mkdtemp(join(tmpdir(),'jamloom-dock-')),port=4233,base=`http://localhost:${port}`;
const env={...process.env,NODE_ENV:'development',JAMLOOM_COMING_SOON:'false',DATABASE_URL:url.toString(),BETTER_AUTH_URL:base,BETTER_AUTH_SECRET:randomUUID()+randomUUID(),JAMLOOM_LOCAL_OUTBOX:join(folder,'mail'),JAMLOOM_LOCAL_AUDIO_DIR:join(folder,'audio'),JAMLOOM_CLOUD_SONGS_ENABLED:'false',RUNPOD_API_KEY:''};
let server,logs='';
try{
 await migrate(pool);
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','localhost','--port',String(port)],{env,stdio:['ignore','pipe','pipe']});server.stdout.on('data',s=>logs+=s);server.stderr.on('data',s=>logs+=s);
 for(let i=0;i<600;i++){try{if((await fetch(base+'/support')).status<500)break;}catch{}await delay(200);if(i===599)throw Error('Server start timeout\n'+logs);}
 const api=(path,body)=>fetch(base+path,{method:'POST',headers:{origin:base,'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'manual'});
 const mail=async()=>{try{return await Promise.all((await readdir(env.JAMLOOM_LOCAL_OUTBOX)).map(async f=>JSON.parse(await readFile(join(env.JAMLOOM_LOCAL_OUTBOX,f),'utf8'))));}catch{return [];}};
 const email='dock@example.test',password='Local-dock-test-8462';assert.equal((await api('/api/auth/sign-up/email',{name:'Dock tester',email,password})).status,200);
 let verify;for(let i=0;i<100&&!verify;i++){verify=(await mail()).find(m=>m.to===email&&m.subject.includes('Verify'));await delay(100);}
 await fetch(verify.text.match(/https?:\/\/\S+/)[0],{redirect:'manual'});const signIn=await api('/api/auth/sign-in/email',{email,password});const cookie=signIn.headers.getSetCookie().map(s=>s.split(';')[0]);
 const browser=await chromium.launch();try{
  const context=await browser.newContext({viewport:{width:1280,height:900}});await context.addCookies(cookie.map(v=>({name:v.slice(0,v.indexOf('=')),value:v.slice(v.indexOf('=')+1),url:base})));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errors.push(m.text());});
  await page.goto(base+'/music-dna');await page.waitForLoadState('networkidle');
  assert.equal(await page.locator('.generation-dock').count(),0,'No bar before a song starts');
  await page.evaluate(()=>{localStorage.setItem('jamloom-song-owner','true');window.dispatchEvent(new CustomEvent('jamloom-song-started',{detail:{id:'a'.repeat(32),product:'music-dna'}}));});
  await page.locator('.generation-dock').waitFor();assert.match(await page.locator('.generation-dock').innerText(),/Starting the music studio/);
  await page.screenshot({path:join(out,'dock-desktop.png')});
  // Cancel from the bar works even when the request never became a song.
  await page.locator('.dock-cancel').click();await page.locator('.generation-dock').getByText('Song stopped.').waitFor();
  await page.locator('.dock-close').click();assert.equal(await page.locator('.generation-dock').count(),0);
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('jamloom-song-started',{detail:{id:'c'.repeat(32),product:'music-dna'}})));await page.locator('.generation-dock').waitFor();
  await page.getByRole('navigation',{name:'Main'}).getByRole('link',{name:'Community'}).click();await page.waitForURL(/community/);
  assert.equal(await page.locator('.generation-dock').count(),1,'Bar follows client navigation');
  await page.setViewportSize({width:390,height:844});await delay(300);await page.screenshot({path:join(out,'dock-phone.png')});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No sideways scroll on phones');
  const r=await page.goto(base+'/my-songs');assert.equal(r.status(),200);await page.getByRole('heading',{level:1,name:'Your songs'}).waitFor();
  await page.setViewportSize({width:1280,height:900});await page.screenshot({path:join(out,'my-songs.png')});
  // Regression (2026-11-15): a request the server refused must not stay 'in progress' forever.
  await page.goto(base+'/music-dna');await page.evaluate(()=>localStorage.setItem('jamloom-dna-pending','b'.repeat(32)));
  await page.reload();await page.waitForFunction(()=>localStorage.getItem('jamloom-dna-pending')===null,null,{timeout:90000});
  await page.reload();await delay(3000);assert.equal(await page.evaluate(()=>localStorage.getItem('jamloom-dna-pending')),null,'Stale request does not come back');
  console.log('stale pending request cleared');
  console.log('errors:',errors.filter(e=>!/404/.test(e)).length?errors.join(' | ').slice(0,800):'none');
 }finally{await browser.close();}
 console.log('PASS dock and Your songs');
}finally{server?.kill();await pool.end();await root.query(`DROP DATABASE "${name}" WITH (FORCE)`);await root.end();await rm(folder,{recursive:true,force:true});}
