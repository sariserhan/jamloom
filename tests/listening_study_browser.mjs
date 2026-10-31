// Isolated synthetic UI fixtures only; no owner observations are produced.
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,extname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {chromium,webkit} from '../apps/site/node_modules/playwright/index.mjs';
const root=resolve(import.meta.dirname,'..'),temp=await mkdtemp(join(tmpdir(),'jamloom-study-test-'));
const evidence=await mkdtemp(join(root,'renders/listening-study-browser-'));
console.log('Evidence: '+evidence);
execFileSync('python3',['-c',`
import sys,json,shutil
from pathlib import Path
sys.path.insert(0,'tests/integration')
from verify_listening_review import fixture
from prepare_listening_study import prepare
p=Path(sys.argv[1]);b=p/'batch';fixture(b)
old=b/'synthetic-ui-fixture/4123';new=b/'synthetic-ui-fixture/4124';shutil.copytree(old,new)
for f in list(new.rglob('*')):
 if f.is_file() and f.suffix!='.wav':f.write_text(f.read_text().replace('a'*24,'b'*24))
for f in list(new.rglob('a*.wav')):f.rename(f.with_name(f.name.replace('a'*24,'b'*24)))
r=json.loads((b/'report.json').read_text());row=dict(r['records'][0],seed=4124,block_id='b'*24);r['records'].append(row);(b/'report.json').write_text(json.dumps(r))
assert prepare(b,p/'study')==2
`,temp],{cwd:root});
const server=createServer(async(req,res)=>{
  try{
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';
    if(!/^[a-zA-Z0-9_./-]+$/.test(name)||name.split('/').includes('..'))throw Error('path');
    const data=await readFile(join(temp,'study',name));
    res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.wav':'audio/wav'})[extname(name)]||'text/plain','Cache-Control':'no-store','Content-Length':String(data.length)});res.end(data);
  }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
try{
  for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
    const browser=await engine.launch(name==='chromium'&&process.env.JAMLOOM_TEST_CHROME==='1'?{channel:'chrome'}:{}),context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[],external=[];
    page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(15000);
    page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(base+'/')&&!r.url().startsWith('blob:'))external.push(r.url());});
    try{
      await page.goto(base);await page.locator('#progress').filter({hasText:'0 of 2'}).waitFor();
      const frame=page.frameLocator('#review');
      await frame.locator('form').waitFor();assert.equal(await frame.locator('[name=listener_id]').inputValue(),'owner');
      assert.equal(await frame.locator('[name=listener_id]').getAttribute('readonly'),'');
      await page.locator('#ratings').click();assert.match(await page.locator('#export-status').innerText(),/Complete a block/);
      await frame.locator('select').first().selectOption('yes');
      await page.locator('#next').click();await frame.locator('select[name^=bbbb]').first().waitFor();assert.equal(await frame.locator('select').first().inputValue(),'');
      await page.locator('#previous').click();await frame.locator('select[name^=aaaa]').first().waitFor();assert.equal(await frame.locator('select').first().inputValue(),'yes');
      await page.reload();await frame.locator('select').first().waitFor();assert.equal(await frame.locator('select').first().inputValue(),'yes');
      for(const select of await frame.locator('select').all()){
        const field=await select.getAttribute('name');await select.selectOption(field.startsWith('pair-')?'tie':field.endsWith('_1_5')?'1':field.endsWith('technical_failure')?'yes':'no');
      }
      await frame.locator('textarea').first().fill('=SYNTHETIC_UI_TEST_ONLY');
      await frame.getByRole('checkbox').check();await page.locator('#progress').filter({hasText:'1 of 2'}).waitFor();
      for(const [id,file] of [['ratings','ratings.csv'],['pairs','pairs.csv']]){
        const event=page.waitForEvent('download');await page.locator('#'+id).click();await(await event).saveAs(join(temp,file));
      }
      execFileSync('python3',['-c',`import sys,csv;from pathlib import Path;sys.path.insert(0,'scripts');from summarize_listening import summarize;p=Path(sys.argv[1]);r=summarize(p/'batch',[p/'ratings.csv'],[p/'pairs.csv']);assert r['individual_ratings']==4 and r['individual_pairs']==3 and r['formal_quality']=='NOT RUN';rows=list(csv.DictReader((p/'ratings.csv').open(encoding='utf-8-sig')));assert rows[0]['notes']=="'=SYNTHETIC_UI_TEST_ONLY"`,temp],{cwd:root});
      const audio=frame.locator('audio').first();await audio.evaluate(async a=>{a.muted=true;await a.play();a.pause();});
      for(const width of [1280,390]){
        await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        assert.ok(await frame.locator('html').evaluate(el=>el.scrollWidth<=window.innerWidth));
        await page.screenshot({path:join(evidence,`${name}-${width}.png`),caret:'initial'});
      }
      assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
      assert.equal((await page.request.get(base+'/organizer-key.json')).status(),404);
      await writeFile(join(evidence,name+'.json'),JSON.stringify({status:'PASS',browser:browser.version(),checks:['blank/incomplete export denied','owner identity locked','draft survives block switch and reload','only complete blocks exported','CSV accepted by summarizer','formula escaping','playback','desktop/mobile no overflow','organizer key unavailable','no external requests or script errors'],human_listening:'NOT RUN',responses:'Synthetic temporary UI fixtures, deleted'},null,2));
      console.log(name+' PASS');
    }finally{await context.close();await browser.close();}
  }
}finally{await new Promise(r=>server.close(r));await rm(temp,{recursive:true,force:true});}
