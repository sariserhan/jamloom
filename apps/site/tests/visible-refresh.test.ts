import test from 'node:test';import assert from 'node:assert/strict';
import {visibleRefresh,IDLE_MS} from '../lib/visible-refresh';

test('display refresh pauses for an unattended tab and resumes on activity',async t=>{
 const listeners:Record<string,()=>void>={},on=(e:string,f:()=>void)=>{listeners[e]=f;},off=()=>{};
 (globalThis as any).window={addEventListener:on,removeEventListener:off};
 (globalThis as any).document={hidden:false,addEventListener:on,removeEventListener:off};
 t.mock.timers.enable({apis:['setInterval']});
 let now=0,calls=0;const flush=()=>new Promise(r=>setImmediate(r));
 const stop=visibleRefresh(()=>{calls++;},60000,()=>now);await flush();assert.equal(calls,1);
 now+=60000;t.mock.timers.tick(60000);await flush();assert.equal(calls,2,'refreshes while attended');
 now=IDLE_MS+60000;t.mock.timers.tick(60000);await flush();
 now+=60000;t.mock.timers.tick(60000);await flush();assert.equal(calls,2,'no timed refresh after idle');
 listeners.pointerdown();await flush();assert.equal(calls,3,'activity refreshes at once');
 now+=60000;t.mock.timers.tick(60000);await flush();assert.equal(calls,4,'timer resumes');
 stop();
});
