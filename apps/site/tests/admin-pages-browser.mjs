// Renders the admin overview, billing and catalogue review pages as the owner in Chromium
// against a disposable loopback database (next dev). Fails on any page or console error.
// Usage: JAMLOOM_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres node --import tsx tests/admin-pages-browser.mjs
import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {mkdtemp,readdir,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {spawn} from 'node:child_process';import {setTimeout as delay} from 'node:timers/promises';import {chromium} from 'playwright';
import {createPool} from '../lib/database.ts';import {migrate} from '../lib/migrations.ts';import {OWNER_EMAIL} from '../lib/admin-access.ts';import {localAudioStore} from '../lib/audio-store.ts';import {PrivateAudio} from '../lib/private-audio.ts';import {AdminStore} from '../lib/admin-store.ts';import {audioFixture,input} from './audio-fixture.ts';

const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');
const root=createPool(url.toString()),name='jamloom_admin_pages_'+randomUUID().replaceAll('-','');await root.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
const pool=createPool(url.toString()),folder=await mkdtemp(join(tmpdir(),'jamloom-admin-pages-')),port=4231,base=`http://localhost:${port}`;
const env={...process.env,NODE_ENV:'development',JAMLOOM_COMING_SOON:'false',DATABASE_URL:url.toString(),BETTER_AUTH_URL:base,BETTER_AUTH_SECRET:randomUUID()+randomUUID(),JAMLOOM_LOCAL_OUTBOX:join(folder,'mail'),JAMLOOM_LOCAL_AUDIO_DIR:join(folder,'audio'),CRON_SECRET:randomUUID(),R2_ACCOUNT_ID:'',JAMLOOM_CLOUD_SONGS_ENABLED:'false',RUNPOD_API_KEY:''};
let server,logs='';
try{
 await migrate(pool);
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','localhost','--port',String(port)],{env,stdio:['ignore','pipe','pipe']});server.stdout.on('data',s=>logs+=s);server.stderr.on('data',s=>logs+=s);
 for(let i=0;i<600;i++){try{if((await fetch(base+'/support')).status<500)break;}catch{}await delay(200);if(i===599)throw Error('Server start timeout\n'+logs);}
 const api=(path,body)=>fetch(base+path,{method:'POST',headers:{origin:base,'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'manual'});
 const mail=async()=>{try{return await Promise.all((await readdir(env.JAMLOOM_LOCAL_OUTBOX)).map(async f=>JSON.parse(await readFile(join(env.JAMLOOM_LOCAL_OUTBOX,f),'utf8'))));}catch{return [];}};
 const password='Local-admin-pages-test-8462';assert.equal((await api('/api/auth/sign-up/email',{name:'Owner',email:OWNER_EMAIL,password})).status,200);
 let verify;for(let i=0;i<100&&!verify;i++){verify=(await mail()).find(m=>m.to===OWNER_EMAIL&&m.subject.includes('Verify'));await delay(100);}assert.ok(verify,'verification mail');
 await fetch(verify.text.match(/https?:\/\/\S+/)[0],{redirect:'manual'});
 const signIn=await api('/api/auth/sign-in/email',{email:OWNER_EMAIL,password});assert.equal(signIn.status,200);const cookie=signIn.headers.getSetCookie().map(s=>s.split(';')[0]);
 const ownerId=(await pool.query('SELECT id FROM "user" WHERE email=$1',[OWNER_EMAIL])).rows[0].id;
 // Fixtures: a second creator with a submitted public track, a credit gift and a reservation.
 await pool.query(`INSERT INTO "user"(id,name,email,"emailVerified") VALUES('creator','Creator','creator@example.test',true)`);
 const audio=new PrivateAudio(pool,localAudioStore(env.JAMLOOM_LOCAL_AUDIO_DIR));await audio.reserve('creator',{...input(audioFixture()),visibility:'public',publication:{artist:'Test artist',description:'Review fixture',mood:'playful',consent:true}});
 await pool.query("UPDATE track_assets SET state='ready'");await pool.query("UPDATE catalogue_submissions SET state='submitted'");
 await new AdminStore(pool,base).credits(ownerId,'creator',250,{});
 const browser=await chromium.launch();try{
  const context=await browser.newContext();await context.addCookies(cookie.map(v=>({name:v.slice(0,v.indexOf('=')),value:v.slice(v.indexOf('=')+1),url:base})));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  for(const path of ['/admin','/admin/billing','/admin/users','/review']){
   errors.length=0;const r=await page.goto(base+path);await page.waitForLoadState('networkidle');
   const h1=await page.getByRole('heading',{level:1}).first().textContent().catch(()=>null);
   console.log(path,r.status(),JSON.stringify(h1),errors.length?'ERRORS: '+errors.join(' | ').slice(0,1500):'ok');
  }
 }finally{await browser.close();}
}finally{server?.kill();await pool.end();await root.query(`DROP DATABASE "${name}" WITH (FORCE)`);await root.end();await rm(folder,{recursive:true,force:true});
 const serverErrors=logs.split('\n').filter(l=>/error|Error/.test(l)).slice(0,30).join('\n');if(serverErrors)console.log('--- server log errors ---\n'+serverErrors);}
