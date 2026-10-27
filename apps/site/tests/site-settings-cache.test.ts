import test from 'node:test';
import assert from 'node:assert/strict';
import type {Pool} from 'pg';
import {cachedSiteSettings,invalidateSiteSettings,defaultSettings} from '../lib/site-settings';

test('settings share in-flight reads, retry failures and isolate invalidation and pools',async()=>{
 const waiting:Array<{resolve:(value:unknown)=>void;reject:(error:Error)=>void}>=[];
 const pool={query:()=>new Promise((resolve,reject)=>waiting.push({resolve,reject}))} as unknown as Pool;
 invalidateSiteSettings();
 const reads=Array.from({length:30},()=>cachedSiteSettings(pool));assert.equal(waiting.length,1);
 waiting.shift()!.resolve({rows:[defaultSettings]});await Promise.all(reads);await cachedSiteSettings(pool);assert.equal(waiting.length,0);
 invalidateSiteSettings();const old=cachedSiteSettings(pool);const oldRequest=waiting.shift()!;
 invalidateSiteSettings();const fresh=cachedSiteSettings(pool);waiting.shift()!.resolve({rows:[{...defaultSettings,revision:1,maintenance:true}]});await fresh;
 oldRequest.resolve({rows:[defaultSettings]});await old;assert.equal((await cachedSiteSettings(pool)).revision,1);
 invalidateSiteSettings();const rejected=cachedSiteSettings(pool);waiting.shift()!.reject(Error('Offline'));await assert.rejects(rejected,/Offline/);
 const retry=cachedSiteSettings(pool);assert.equal(waiting.length,1);waiting.shift()!.resolve({rows:[defaultSettings]});await retry;
 let otherReads=0;const other={query:async()=>{otherReads++;return {rows:[{...defaultSettings,revision:2}]};}} as unknown as Pool;
 assert.equal((await cachedSiteSettings(other)).revision,2);assert.equal(otherReads,1);invalidateSiteSettings();
});
