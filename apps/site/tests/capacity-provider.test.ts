import test from 'node:test';
import assert from 'node:assert/strict';
import {capacityProvider,capacityFailureDiagnostic} from '../lib/cloud-capacity';

test('capacity reads recover one transient failure within the same eight-second deadline',async t=>{
 for(const failure of ['network',502,503,504] as const){
  let calls=0;const signals:AbortSignal[]=[];
  const timeout=AbortSignal.timeout.bind(AbortSignal),deadlines:number[]=[];
  const spy=t.mock.method(AbortSignal,'timeout',(ms:number)=>{deadlines.push(ms);return timeout(ms);});
  try{
   const provider=capacityProvider('private-key','fixture',async(_url,init)=>{
    assert.equal(init?.method,'GET');signals.push(init!.signal!);calls++;
    if(calls===1){if(failure==='network')throw new TypeError('private-url');return new Response('private-body',{status:failure});}
    return Response.json({workers:{running:1}});
   });
   assert.deepEqual(await provider.health(),{workers:{running:1}});assert.equal(calls,2);
   assert.equal(signals[0],signals[1]);assert.deepEqual(deadlines,[8000]);
  }finally{spy.mock.restore();}
 }
});

test('exhausted reads and invalid responses stop with sanitized diagnostics',async()=>{
 for(const status of [401,403,404,429,500,502,503,504]){
  let calls=0;
  const provider=capacityProvider('secret','fixture',async()=>{calls++;return new Response('private-body',{status});});
  await assert.rejects(provider.endpoint(),error=>{
   assert.deepEqual(capacityFailureDiagnostic(error),{source:'provider',operation:'endpoint',kind:'http',status});
   assert(!String(error).includes('private'));return true;
  });
  assert.equal(calls,[502,503,504].includes(status)?2:1);
 }
 let calls=0;
 await assert.rejects(capacityProvider('secret','fixture',async()=>{calls++;return new Response('invalid private JSON');}).catalog(),error=>{
  assert.deepEqual(capacityFailureDiagnostic(error),{source:'provider',operation:'catalog',kind:'response'});return true;
 });assert.equal(calls,1);
});

test('activation and shutdown mutations are never replayed after ambiguous responses',async()=>{
 for(const n of [0,1] as const){
  for(const failure of ['network','http'] as const){
   let calls=0;
   const provider=capacityProvider('secret','fixture',async(_url,init)=>{
    calls++;assert.equal(init?.method,'PATCH');assert.deepEqual(JSON.parse(String(init?.body)),{workers:{min:n,max:n}});
    if(failure==='network')throw Error('private credentials');return new Response('private-body',{status:503});
   });
   await assert.rejects(provider.setWorkers(n),error=>{
    assert.deepEqual(capacityFailureDiagnostic(error),{source:'provider',operation:n?'activate':'stop',kind:failure==='network'?'transport':'http',...(failure==='http'?{status:503}:{})});return true;
   });assert.equal(calls,1);
  }
 }
});

test('an elapsed provider deadline prevents retry and identifies timeout',async t=>{
 const controller=new AbortController();
 t.mock.method(AbortSignal,'timeout',()=>controller.signal);
 let calls=0;
 const provider=capacityProvider('secret','fixture',async()=>{calls++;controller.abort();throw Error('raw failure');});
 await assert.rejects(provider.health(),error=>{
  assert.deepEqual(capacityFailureDiagnostic(error),{source:'provider',operation:'health',kind:'timeout'});return true;
 });assert.equal(calls,1);
});

test('guardian diagnostics expose only known error codes, never private error fields',()=>{
 const error=Object.assign(new Error('postgres://user:secret@private-host'),{code:'57014',query:'private SQL',detail:'private'});
 assert.deepEqual(capacityFailureDiagnostic(error),{source:'database-or-network',code:'57014'});
 for(const value of [Object.assign(error,{code:'private code'}),new Error('private'),null,'private'])assert.deepEqual(capacityFailureDiagnostic(value),{source:'unknown'});
});
