import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {VastProvider} from '../lib/vast-provider';

test('local qualification simulates only rental inventory and shutdown, never provider traffic',async()=>{
 const folder=resolve('../../renders/dj-metal-endurance-fixture-'+randomUUID());await mkdir(folder,{mode:0o700});
 const file=resolve(folder,'provider.json'),label='jamloom-local-metal-'+randomUUID().replaceAll('-','');
 const prior={...process.env},fetcher=globalThis.fetch;
 try{
  await writeFile(file,JSON.stringify({schema:'jamloom-local-provider-1',label,stopped:false}),{mode:0o600});
  Object.assign(process.env,{JAMLOOM_LOCAL_DJ_QUALIFICATION:'true',JAMLOOM_LOCAL_DJ_PROVIDER:file,VASTAI_KEY:'local-test-provider-only',DATABASE_URL:'postgresql://127.0.0.1/fixture',JAMLOOM_TEST_DATABASE_URL:'postgresql://127.0.0.1/fixture'});
  globalThis.fetch=async()=>{throw Error('Unexpected external request');};
  await import('./dj-local-provider.mjs');
  const provider=new VastProvider('local-test-provider-only');
  assert.deepEqual(await provider.inventory(1),[{id:1,label}]);
  await assert.rejects(fetch('https://console.vast.ai/api/v0/asks/1',{method:'PUT'}),/forbids/);
  await provider.destroy(1);assert.deepEqual(await provider.inventory(1),[]);
 }finally{
  globalThis.fetch=fetcher;for(const key of Object.keys(process.env))if(!(key in prior))delete process.env[key];Object.assign(process.env,prior);
  await rm(folder,{recursive:true,force:true});
 }
});
