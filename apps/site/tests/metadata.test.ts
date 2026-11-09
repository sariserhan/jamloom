import assert from 'node:assert/strict';
import test from 'node:test';
import robots from '../app/robots';
import sitemap from '../app/sitemap';
import {origin,features} from '../lib/product';

test('metadata follows runtime launch mode and never advertises private routes',()=>{
 const previous=process.env.JAMLOOM_COMING_SOON;
 try{
  for(const mode of [undefined,'true','false']){
   if(mode===undefined)delete process.env.JAMLOOM_COMING_SOON;else process.env.JAMLOOM_COMING_SOON=mode;
   const map=sitemap(),bot=robots(),rules=bot.rules;
   assert.ok(!Array.isArray(rules));
   assert.equal(bot.sitemap,origin+'/sitemap.xml');
   assert.equal(new Set(map.map(p=>p.url)).size,map.length);
   assert.ok(map.every(p=>p.url.startsWith(origin+'/')));
   assert.ok(map.every(p=>!/^\/(account|admin|library|playlists|review|api|studio)(\/|$)/.test(new URL(p.url).pathname)));
   if(mode==='false'){
    for(const f of features)assert.ok(map.some(p=>p.url===origin+'/'+f.slug));
    assert.ok(Array.isArray(rules.disallow));
    for(const path of ['/account','/admin','/api/','/academy/checkout','/academy/progress'])assert.ok(rules.disallow.includes(path));
   }else{
    assert.deepEqual(map,['/','/ai-dj','/pro','/live-dj','/dj-studio','/pricing','/download'].map(p=>({url:origin+p})));assert.ok(rules.allow?.includes('/pro$'));
    assert.equal(rules.disallow,'/');assert.ok(rules.allow?.includes('/$'));
   }
  }
 }finally{if(previous===undefined)delete process.env.JAMLOOM_COMING_SOON;else process.env.JAMLOOM_COMING_SOON=previous;}
});

test('published learning guides have complete links and real modification dates',async()=>{
 const {guides,information}=await import('../lib/editorial');
 const previous=process.env.JAMLOOM_COMING_SOON;process.env.JAMLOOM_COMING_SOON='false';
 try{const urls=new Set(sitemap().map(p=>new URL(p.url).pathname));
  for(const [slug,g] of Object.entries(guides)){assert.ok(urls.has('/learn/'+slug));for(const id of g.related??[])assert.ok(guides[id],slug+' has broken related link '+id);if(g.workspace)assert.ok(urls.has(g.workspace.href));if(g.updated)assert.ok(Number.isFinite(Date.parse(g.updated)));}
  for(const path of ['/about','/learn','/start','/tour','/community'])assert.ok(urls.has(path));
  assert.ok(information.about);
 }finally{if(previous===undefined)delete process.env.JAMLOOM_COMING_SOON;else process.env.JAMLOOM_COMING_SOON=previous;}
});
