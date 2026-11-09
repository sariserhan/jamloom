// Submit an explicit list of changed public URLs after production deployment.
// The verification key is intentionally public, not an account credential.
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin='https://www.jamloom.com',key='e7a365c83ea50f0bcbae97141922e096';
const paths=process.argv.slice(2);assert.ok(paths.length>0&&paths.length<=10000,'Pass changed public paths');
const sitemap=await fetch(origin+'/sitemap.xml',{redirect:'error',signal:AbortSignal.timeout(15000)});assert.equal(sitemap.status,200);
const allowed=new Set([...((await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g))].map(m=>m[1]));
const urlList=[...new Set(paths.map(path=>{assert.ok(path.startsWith('/')&&!path.startsWith('//'));const url=new URL(path,origin);assert.equal(url.origin,origin);assert.ok(!url.search&&!url.hash&&allowed.has(url.href),'URL must appear in the public sitemap');return url.href;}))];
const expected=(await readFile(new URL('../public/'+key+'.txt',import.meta.url),'utf8')).trim();assert.equal(expected,key);
const proof=await fetch(origin+'/'+key+'.txt',{redirect:'error',signal:AbortSignal.timeout(15000)});assert.equal(proof.status,200);assert.equal((await proof.text()).trim(),key);
const response=await fetch('https://api.indexnow.org/indexnow',{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify({host:'www.jamloom.com',key,keyLocation:origin+'/'+key+'.txt',urlList}),redirect:'error',signal:AbortSignal.timeout(15000)});
assert.ok([200,202].includes(response.status),'IndexNow rejected submission: '+response.status);
console.log(JSON.stringify({at:new Date().toISOString(),status:response.status,urls:urlList,meaning:response.status===200?'received, indexing not guaranteed':'received, key validation pending'},null,2));
