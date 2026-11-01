import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
import {webkit} from 'playwright';
const root=resolve('../../build-ios-studio/Studio'),out=resolve('../../docs/evidence/song-language-20261101');
const server=createServer(async(req,res)=>{const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!path.startsWith(root+sep)){res.writeHead(403).end();return;}try{const bytes=await readFile(path);res.writeHead(200,{'Content-Type':{'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.wasm':'application/wasm'}[extname(path)]??'application/octet-stream'}).end(bytes);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,browser=await webkit.launch();
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/singing-home.html');const all=await page.locator('#songs .song-link').count();assert.ok(all>10);
 await page.getByLabel('Song language',{exact:true}).selectOption('fr');assert.equal(await page.locator('#songs .song-link').count(),1);assert.match(await page.locator('#songs').innerText(),/Jacques/);
 await page.getByLabel('Song language',{exact:true}).selectOption('en');assert.equal(await page.locator('#songs .song-link').count(),all-1);assert.doesNotMatch(await page.locator('#songs').innerText(),/Jacques/);
 await page.getByLabel('Song language',{exact:true}).selectOption('');assert.equal(await page.locator('#songs .song-link').count(),all);assert.equal(await page.locator('#warmup-list .song-link').count(),12);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'offline.json'),JSON.stringify({status:'PASS',browser:'WebKit',nativeBundle:true,songs:all,french:1,warmupsUnchanged:12},null,2)+'\n');
 console.log('PASS native offline Singing language filtering');
}finally{await browser.close();await new Promise(r=>server.close(r));}
