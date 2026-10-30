import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const base=process.env.JAMLOOM_TARGET_REVIEW_URL||'http://127.0.0.1:8769';
const output=process.env.JAMLOOM_TARGET_REVIEW_EVIDENCE||'../../docs/evidence/completion-20261030/target-review';
await mkdir(output,{recursive:true});
const results=[];
for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch({headless:true});
 try{
  const context=await browser.newContext({acceptDownloads:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);assert.match(await page.title(),/Sung target review/);
  await page.getByText('Both reviews ready. No microphone access or scoring.',{exact:true}).waitFor();
  assert.equal(await page.locator('article').count(),2);
  for(const width of [1280,390]){
   await page.setViewportSize({width,height:900});
   for(const [index,article] of (await page.locator('article').all()).entries()){
    const audio=article.locator('audio');
    await audio.evaluate(async a=>{a.muted=true;await a.play();});
    await page.waitForFunction(i=>document.querySelectorAll('audio')[i].currentTime>.1,index);
    assert(Math.abs(await audio.evaluate(a=>a.duration)-120)<.1);
    await article.locator('.phrases button').first().click();
    await audio.evaluate(a=>a.pause());
    const details=article.locator('details').last();if(!await details.evaluate(d=>d.open))await details.locator('summary').click();
    const input=details.locator('textarea'),draft=JSON.parse(await input.inputValue());
    const candidate={...draft,verified:true,scoringEnabled:true,words:[{at:1,end:2,text:'review fixture'}],notes:[{at:1,end:2,note:57}]};
    await input.fill(JSON.stringify({...candidate,notes:[{at:1,end:121,note:57}]}));
    await details.getByRole('button',{name:'Check draft timing',exact:true}).click();
    assert.match(await details.getByRole('status').textContent(),/inside the recording/);
    await input.fill(JSON.stringify(candidate));
    const downloaded=page.waitForEvent('download');
    await details.getByRole('button',{name:'Export unverified draft',exact:true}).click();
    const download=await downloaded,result=JSON.parse(await readFile(await download.path(),'utf8'));
    assert.equal(result.verified,false);assert.equal(result.scoringEnabled,false);assert.equal(result.recordingSha256,draft.recordingSha256);
    assert.deepEqual(result.notes,candidate.notes);
    await input.fill('{}');
    await details.locator('input[type=file]').setInputFiles({name:'draft.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(result))});
    await page.waitForFunction(({index,id})=>JSON.parse(document.querySelectorAll('textarea')[index].value).recordingId===id,{index,id:result.recordingId});
    assert.deepEqual(JSON.parse(await input.inputValue()),result);
   }
   assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
   await page.screenshot({path:`${output}/${name}-${width}.png`,fullPage:true});
   results.push({browser:name,width,playback:'PASS',seek:'PASS',invalidTiming:'PASS',exportImport:'PASS',unverifiedPreserved:'PASS'});
  }
  assert.deepEqual(errors,[]);
  await context.close();
 }finally{await browser.close();}
}
await writeFile(`${output}/results.json`,JSON.stringify({results,groundTruth:'NOT RUN; editor round-trip uses synthetic annotations only'},null,2)+'\n');
console.log(JSON.stringify(results,null,2));
