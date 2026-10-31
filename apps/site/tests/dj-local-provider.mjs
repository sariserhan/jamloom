// Test-only rental substitute for fresh LOCAL Metal generation. Never app code.
// The renderer remains real; only inventory/destroy are simulated. No Vast traffic.
import assert from 'node:assert/strict';
import {readFile,writeFile,rename,stat} from 'node:fs/promises';
import {resolve} from 'node:path';

const file=process.env.JAMLOOM_LOCAL_DJ_PROVIDER;
assert.equal(process.env.JAMLOOM_LOCAL_DJ_QUALIFICATION,'true');
assert.equal(process.env.VASTAI_KEY,'local-test-provider-only');
assert(file&&resolve(file).startsWith(resolve('../../renders/dj-metal-endurance-') ));
assert.equal((await stat(file)).mode&0o077,0);
for(const key of ['DATABASE_URL','JAMLOOM_TEST_DATABASE_URL']){
 if(process.env[key])assert.equal(new URL(process.env[key]).hostname,'127.0.0.1');
}
const read=async()=>{const value=JSON.parse(await readFile(file,'utf8'));assert.equal(value.schema,'jamloom-local-provider-1');assert.match(value.label,/^jamloom-local-metal-[a-f0-9]{32}$/);assert.equal(typeof value.stopped,'boolean');return value;};
const original=globalThis.fetch;
globalThis.fetch=async(input,options={})=>{
 const url=new URL(input instanceof Request?input.url:String(input));
 if(url.hostname!=='console.vast.ai')return original(input,options);
 const state=await read(),method=options.method??'GET';let body;
 if(method==='GET'&&url.pathname.replace(/\/$/,'')==='/api/v0/users/current')body={id:1};
 else if(method==='GET'&&url.pathname.replace(/\/$/,'')==='/api/v1/instances')body={success:true,instances:state.stopped?[]:[{id:1,label:state.label}],instances_found:state.stopped?0:1,total_instances:state.stopped?0:1,next_token:null};
 else if(method==='DELETE'&&url.pathname.replace(/\/$/,'')==='/api/v0/instances/1'){
  const temporary=file+'.'+process.pid+'.tmp';await writeFile(temporary,JSON.stringify({...state,stopped:true}),{mode:0o600});await rename(temporary,file);body={success:true};
 }else throw Error('Local qualification forbids this provider operation');
 return new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json'}});
};
