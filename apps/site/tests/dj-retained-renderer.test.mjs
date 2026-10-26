import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {retainedRenderer} from './dj-retained-renderer.mjs';
test('retained rehearsal verifies source hashes, preserves retries and discloses synthetic receipts',async()=>{
 const renderer=await retainedRenderer(fileURLToPath(new URL('../../../',import.meta.url))),url='http://127.0.0.1:8768/render';
 const request={version:1,session:'test',sequence:0,seed:42};
 const first=await renderer.fetch(url,{body:JSON.stringify({job:'a',request})}),retry=await renderer.fetch(url,{body:JSON.stringify({job:'a',request})});
 const one=JSON.parse(first.headers.get('x-jamloom-receipt')),again=JSON.parse(retry.headers.get('x-jamloom-receipt'));assert.deepEqual(one,again);assert.equal(one.retained_rehearsal,true);assert.equal(renderer.proof.length,1);assert.equal(renderer.proof[0].newGeneration,false);
 const second=await renderer.fetch(url,{body:JSON.stringify({job:'b',request:{...request,sequence:1}})});assert.notEqual(JSON.parse(second.headers.get('x-jamloom-receipt')).sha256,one.sha256);
 await assert.rejects(renderer.fetch(url,{body:JSON.stringify({job:'a',request:{...request,seed:99}})}),/retry/);
 await assert.rejects(renderer.fetch('https://example.com',{}));
 await first.body.cancel();await retry.body.cancel();await second.body.cancel();
});
