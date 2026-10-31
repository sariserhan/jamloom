// Playback-only check: no owner answers, recordings or submissions are created.
import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
const require=createRequire(new URL('../apps/site/package.json',import.meta.url));
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {silenceSpeakers}=await import('../apps/site/tests/silent-audio.mjs');
const target=process.argv[2];
const output=process.argv[3];
const mediaRoot=process.argv[4];
if(!target || !output || !mediaRoot || new URL(target).hostname!=='127.0.0.1')throw Error('Local gallery URL, evidence directory and packaged media directory required');
const study=JSON.parse(readFileSync(join(mediaRoot,'study.json'),'utf8'));
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome'}),results=[];
try{
 for(const width of [1280,390]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[],writes=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(request.method()!=='GET')writes.push(request.method()+' '+request.url())});
  await page.addInitScript(silenceSpeakers);
  await page.goto(new URL('/',target).href);
  await page.getByRole('heading',{name:'Your review decision is saved',exact:true}).waitFor();
  await page.locator('#received-status').filter({hasText:'General acceptance: received'}).waitFor();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.goto(target);
  await page.getByRole('status').filter({hasText:'source recordings.'}).waitFor();
  const count=await page.locator('#source option').count();assert(count>0);
  for(const index of [...new Set([0,count-1])]){
   await page.locator('#source').selectOption(String(index));
   const audios=page.locator('audio');assert.equal(await audios.count(),6);
   for(let player=0;player<6;player++){
    const audio=audios.nth(player);
    await audio.evaluate(a=>new Promise((resolve,reject)=>{
     if(a.readyState>=1)return resolve();
     a.addEventListener('loadedmetadata',resolve,{once:true});
     a.addEventListener('error',()=>reject(Error('Audio metadata failed')),{once:true});
    }));
    const duration=await audio.evaluate(a=>a.duration);assert(Number.isFinite(duration)&&duration>0);
    const block=study.blocks[index],codes=Object.keys(block.audio_sha256).sort();
    const filename=player===0?'source.wav':codes[player-1]+(study.candidate_format==='flac'?'.flac':'.wav');
    const expected=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',join(mediaRoot,block.folder,filename)],{encoding:'utf8'}).trim());
    assert(Number.isFinite(expected)&&Math.abs(duration-expected)<.1);
    await audio.evaluate(async a=>{a.currentTime=Math.min(2,a.duration/2);await a.play()});
    await page.waitForFunction(index=>{const a=document.querySelectorAll('audio')[index];return a.currentTime>Math.min(2,a.duration/2)+.15},player);
    assert.equal(await page.locator('audio').evaluateAll(nodes=>nodes.filter(a=>!a.paused).length),1);
    await audio.evaluate(a=>a.pause());
   }
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  if(count>1){
   await page.locator('audio').nth(1).evaluate(a=>a.play());
   await page.getByRole('button',{name:'Previous sound',exact:true}).click();
   assert.equal(await page.locator('audio').evaluateAll(nodes=>nodes.filter(a=>!a.paused).length),0);
  }
  await page.screenshot({path:output+'/gallery-'+width+'.png',fullPage:false});
  await page.goto(new URL('ratings.html',target).href);
  await page.locator('#recording option').first().waitFor({state:'attached'});
  assert.equal(await page.locator('#recording option').count(),count);
  assert.equal(await page.locator('audio').count(),6);
  const optionalAudio=page.locator('audio').nth(1);
  assert((await optionalAudio.getAttribute('src')).endsWith(study.candidate_format==='flac'?'.flac':'.wav'));
  await optionalAudio.evaluate(async a=>{await a.play()});
  await page.waitForFunction(()=>document.querySelectorAll('audio')[1].currentTime>.15);
  await optionalAudio.evaluate(a=>a.pause());
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
  results.push({width,status:'PASS',sourceCount:count,firstAndLastSourcePlayback:true,seek:true,onePlayer:true,navigationStopsPlayback:true,noOverflow:true,optionalAnnotationsPlayback:true,ownerResultsWritten:false});
  await page.close();
 }
 await writeFile(output+'/gallery-browser.json',JSON.stringify({status:'PASS',browser:'Installed Chrome via Playwright; Browser runtime tool unavailable',target,results},null,2)+'\n');
 console.log(JSON.stringify(results));
}finally{await browser.close()}
