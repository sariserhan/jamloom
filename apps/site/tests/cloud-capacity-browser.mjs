// Real rendered controls with isolated provider/account fixtures; no paid calls.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const base=process.env.JAMLOOM_TEST_URL??'http://127.0.0.1:4236';
assert.equal(new URL(base).hostname,'127.0.0.1');
const output='/tmp/jamloom-capacity-browser';await mkdir(output,{recursive:true});const results=[];
const pcm=Buffer.alloc(9644);pcm.write('RIFF');pcm.writeUInt32LE(pcm.length-8,4);pcm.write('WAVEfmt ',8);pcm.writeUInt32LE(16,16);pcm.writeUInt16LE(1,20);pcm.writeUInt16LE(1,22);pcm.writeUInt32LE(48000,24);pcm.writeUInt32LE(96000,28);pcm.writeUInt16LE(2,32);pcm.writeUInt16LE(16,34);pcm.write('data',36);pcm.writeUInt32LE(pcm.length-44,40);
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch(name==='chromium'?{channel:'chrome'}:{});
 try{
  for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:width===1440?1000:844}});
   context.setDefaultTimeout(20000);
   let state='off',ready=false,posts=0,fail=false;const errors=[];
   await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
   await context.route('**/api/**',r=>{
    const request=r.request(),path=new URL(request.url()).pathname;
    if(path==='/api/account')return r.fulfill({json:{user:{id:'fixture'},balance:{available:40,reserved:0},purchasesReleased:false}});
    if(['/api/taste/song','/api/improvise/song'].includes(path)){
     if(request.method()==='POST'){
      posts++;assert.deepEqual(request.postDataJSON(),{action:'prepare'});state='preparing';
      return r.fulfill(fail?{status:503,json:{error:'Preparation response was lost. Check availability.'}}:{status:202,json:{state,creditsUsed:0}});
     }
     return r.fulfill({json:{available:ready,creditsEnabled:true,signedIn:true,canPrepare:true,capacityState:state,songs:[],next:null}});
    }
    if(path==='/api/music-search')return r.fulfill({json:{suggestions:[]}});
    return r.fulfill({json:{songs:[],tracks:[],notifications:[],next:null,maintenance:false}});
   });
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   for(const product of ['music-dna','improvise']){
    state='off';ready=false;fail=false;const before=posts;
    await page.goto(base+'/'+product);
    if(product==='music-dna'){
     await page.getByRole('combobox',{name:'Search artists or tracks'}).fill('Retained favorite');
     await page.getByRole('option').filter({hasText:'Retained favorite'}).click();
    }else{
     await page.locator('#improvise-create input[type=file]').setInputFiles({name:'retained.wav',mimeType:'audio/wav',buffer:pcm});
    }
    await page.getByRole('button',{name:product==='music-dna'?'Make my music':'Make my song',exact:true}).click();
    const dialog=page.getByRole('dialog'),prepare=dialog.getByRole('button',{name:'Prepare song creation',exact:true});
    await prepare.waitFor();assert.equal(posts,before);
    assert(await dialog.getByRole('button',{name:/^Generate song ·/}).isDisabled());
    await prepare.click();await dialog.getByText('Preparing song creation.',{exact:false}).waitFor();assert.equal(posts,before+1);
    await dialog.getByRole('button',{name:'Check availability',exact:true}).click();assert.equal(posts,before+1);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:output+'/'+name+'-'+width+'-'+product+'-preparing.png'});
    ready=true;state='ready';await dialog.getByRole('button',{name:'Check availability',exact:true}).click();
    await page.waitForFunction(()=>{const b=[...document.querySelectorAll('dialog button')].find(b=>b.textContent.startsWith('Generate song ·'));return b&&!b.disabled;});
    assert.equal(posts,before+1);await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
   }
   // An ambiguous preparation never retries itself. Availability remains read-only.
   state='off';ready=false;fail=true;const before=posts;
   await page.getByRole('button',{name:'Make my song',exact:true}).click();const dialog=page.getByRole('dialog');
   await dialog.getByRole('button',{name:'Prepare song creation',exact:true}).click();await dialog.getByRole('alert').filter({hasText:'response was lost'}).waitFor();
   assert.equal(await dialog.getByRole('button',{name:'Prepare song creation',exact:true}).count(),0);
   await dialog.getByRole('button',{name:'Check availability',exact:true}).click();await dialog.getByText('Preparing song creation.',{exact:false}).waitFor();
   assert.equal(posts,before+1);assert.deepEqual(errors,[]);
   results.push({browser:name,width,status:'PASS',explicitPreparations:posts,automaticRetries:0,generationRequests:0,pageErrors:errors});
   await context.close();
  }
 }finally{await browser.close();}
}
await writeFile(output+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
