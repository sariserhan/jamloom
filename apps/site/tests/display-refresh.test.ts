import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleRefresh} from '../lib/visible-refresh';
import {galleryRead} from '../lib/gallery-read';

test('display polling merges events, skips hidden tabs and does not overlap slow reads',async t=>{
 const win=new EventTarget(),doc=Object.assign(new EventTarget(),{hidden:false});
 Object.defineProperty(globalThis,'window',{value:win,configurable:true});Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
 let now=10000,calls=0,finish:()=>void=()=>{},tick:()=>void=()=>{};
 t.mock.method(Date,'now',()=>now);
 t.mock.method(globalThis,'setInterval',((callback:()=>void)=>{tick=callback;return 1;}) as typeof setInterval);
 t.mock.method(globalThis,'clearInterval',()=>{});
 const stop=visibleRefresh(()=>{calls++;return new Promise<void>(resolve=>finish=resolve);});
 try{
  assert.equal(calls,1);win.dispatchEvent(new Event('focus'));doc.dispatchEvent(new Event('visibilitychange'));now+=60000;tick();assert.equal(calls,1);
  finish();await Promise.resolve();doc.hidden=true;tick();assert.equal(calls,1);
  doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));win.dispatchEvent(new Event('focus'));assert.equal(calls,2);
  finish();await Promise.resolve();win.dispatchEvent(new Event('focus'));assert.equal(calls,2);
  now+=60000;tick();assert.equal(calls,3);stop();finish();await Promise.resolve();now+=60000;tick();win.dispatchEvent(new Event('focus'));assert.equal(calls,3);
 }finally{stop();Reflect.deleteProperty(globalThis,'window');Reflect.deleteProperty(globalThis,'document');}
});

test('public gallery reads share only concurrent work; private reads and mutation refreshes stay fresh',async t=>{
 let calls=0;const finish:((value:Response)=>void)[]=[];
 t.mock.method(globalThis,'fetch',()=>{calls++;return new Promise<Response>(resolve=>finish.push(resolve));});
 const first=galleryRead('/api/taste/song?view=public'),second=galleryRead('/api/taste/song?view=public');assert.equal(calls,1);
 const fresh=galleryRead('/api/taste/song?view=public',true);assert.equal(calls,2);
 finish[0](Response.json({songs:['old']}));finish[1](Response.json({songs:['new']}));
 assert.deepEqual(await(await first).json(),{songs:['old']});assert.deepEqual(await(await second).json(),{songs:['old']});assert.deepEqual(await(await fresh).json(),{songs:['new']});
 const again=galleryRead('/api/taste/song?view=public');assert.equal(calls,3);finish[2](Response.json({songs:[]}));await again;
 const mine=galleryRead('/api/taste/song?view=mine'),other=galleryRead('/api/taste/song?view=mine');assert.equal(calls,5);finish[3](Response.json({songs:[]}));finish[4](Response.json({songs:[]}));await Promise.all([mine,other]);
});
