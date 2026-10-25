// Fault injection in the disposable qualification process only; never loaded by the app.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
assert.ok(process.env.JAMLOOM_DJ_CRASH_RECEIPT);
assert.equal(new URL(process.env.DATABASE_URL).hostname,'127.0.0.1');
assert.match(new URL(process.env.DATABASE_URL).pathname,/^\/jamloom_dj_(pipeline|process)_[a-f0-9]{32}$/);
const original=globalThis.fetch;
globalThis.fetch=async(...args)=>{
 const response=await original(...args);
 if(String(args[0])==='http://127.0.0.1:8768/render'&&response.ok){
  await response.arrayBuffer();
  await writeFile(process.env.JAMLOOM_DJ_CRASH_RECEIPT,response.headers.get('x-jamloom-receipt'),{flag:'wx',mode:0o600});
  process.kill(process.pid,'SIGKILL');
 }
 return response;
};
