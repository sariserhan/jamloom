import test from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {comingSoonEnabled,comingSoonRecovery,comingSoonResponse,publicProductRead} from '../lib/coming-soon';
import {proxy,config} from '../proxy';
import testing from 'next/experimental/testing/server';
import {readdir} from 'node:fs/promises';
import {homeProducts} from '../lib/home-products';
// The installed Next version exposes the proxy matcher under its older name.
const {unstable_doesMiddlewareMatch:doesProxyMatch}=testing;

test('launch gate defaults on and only explicit false disables it',()=>{
 for(const value of [undefined,'','true','FALSE','0'])assert.equal(comingSoonEnabled({JAMLOOM_COMING_SOON:value}),true);
 assert.equal(comingSoonEnabled({JAMLOOM_COMING_SOON:'false'}),false);
});
test('public song collections and playback pass the launch gate without opening generation or private collections',async()=>{
 const id='a'.repeat(32);
 for(const path of ['/api/taste/song','/api/improvise/song']){
  for(const query of ['view=public','view=validation','view=examples','view=public&after='+id+'&language=en&genre=House','id='+id+'&file=audio','id='+id+'&file=audio&download=1']){
   const response=await proxy(new NextRequest('https://www.jamloom.com'+path+'?'+query));
   assert.equal(response.headers.get('x-middleware-next'),'1',query);
  }
  for(const query of ['view=public&view=mine','view=public&id='+id,'id='+id,'id='+id+'&file=plan','id='+id+'&file=input','id=invalid&file=audio','id='+id+'&file=audio&action=submit']){
   assert.equal((await proxy(new NextRequest('https://www.jamloom.com'+path+'?'+query))).status,503,query);
  }
  for(const method of ['POST','DELETE','PUT'])assert.equal((await proxy(new NextRequest('https://www.jamloom.com'+path+'?view=public',{method}))).status,503);
 }
 assert.equal((await proxy(new NextRequest('https://www.jamloom.com/api/taste/song/fake?view=public'))).status,503);
});
test('public DJ set playback is open while creation and private recordings stay protected',async()=>{
 const id='a'.repeat(32);
 for(const path of ['/ai-dj/sets','/api/ai-dj/sets','/api/ai-dj/sets?after='+id,'/api/ai-dj/sets/'+id+'/audio'])assert.equal((await proxy(new NextRequest('https://www.jamloom.com'+path))).headers.get('x-middleware-next'),'1',path);
 for(const path of ['/api/ai-dj/sets?owner=someone','/api/ai-dj/sets/'+id+'/private','/api/ai-dj/recordings','/api/ai-dj/sessions'])assert.equal((await proxy(new NextRequest('https://www.jamloom.com'+path))).status,503,path);
 assert.equal((await proxy(new NextRequest('https://www.jamloom.com/api/ai-dj/sets',{method:'POST'}))).status,503);
});
test('account-free native catalogue suggestions pass the launch gate without opening creation or purchases',async()=>{
 assert.equal(comingSoonRecovery('/api/music-search'),true);assert.equal(comingSoonRecovery('/api/playlist-import'),true);assert.equal(comingSoonRecovery('/api/playlist-import/fake'),false);
 for(const path of ['/api/music-search/fake','/api/taste/song','/api/payments/checkout','/music-dna'])assert.equal(comingSoonRecovery(path),false);
 const response=await proxy(new NextRequest('https://www.jamloom.com/api/music-search',{method:'POST',body:'{"query":"Daft Punk"}'}));
 assert.equal(response.headers.get('x-middleware-next'),'1');
});
test('coming-soon recovery allows login, support and signed callbacks, Pro registration but not unrelated product APIs',()=>{
 for(const path of ['/pro','/dj-studio','/studio/dj.html','/account','/account/sign-up','/api/auth/sign-up/email','/api/pro/stripe','/api/aurowall','/account/sign-in','/account/reset-password','/api/auth/sign-in/email','/api/auth/reset-password/token','/admin','/admin/users','/api/admin/settings','/support','/api/contact','/api/payments/stripe','/api/payments/apple/notifications','/api/academy/stripe','/privacy','/sitemap.xml'])assert.equal(comingSoonRecovery(path),true,path);
 for(const path of ['/api/catalogue','/api/library','/api/account/fake','/api/account/deletion/fake','/api/payments/checkout','/academy','/admin-fake','/support/example','/api/auth/sign-in/email/fake'])assert.equal(comingSoonRecovery(path),false,path);
});
test('launch responses contain real navigation, one tracker and private caching; product APIs stay closed',async()=>{
 const home=comingSoonResponse(new Request('https://www.jamloom.com/?admin=true'));
 assert.equal(home.status,200);assert.equal(home.headers.get('cache-control'),'private, no-store');assert.equal(home.headers.get('vary'),'Cookie');
 const html=await home.text();assert.match(html,/Jamloom is coming soon/);assert.equal((html.match(/vp_QBDH92AC.js/g)||[]).length,1);assert.match(html,/href="\/account\/sign-in"/);assert.ok(!html.includes('mini-deck'));
 for(const product of homeProducts){assert.ok(html.includes(`id="${product.slug}"`));assert.ok(html.includes(product.headline));assert.ok(html.includes(`href="#${product.slug}"`));}
 assert.match(html,/Explore every product without an account/);
 assert.match(html,/<a href="\/report-bug">Report a bug<\/a>/);
 assert.equal(comingSoonRecovery('/report-bug'),true);
 assert.equal(comingSoonRecovery('/singing-academy'),false);
 assert.equal(comingSoonResponse(new Request('https://www.jamloom.com/studio/dj.html')).headers.get('location'),'https://www.jamloom.com/');
 assert.equal(comingSoonResponse(new Request('https://www.jamloom.com/api/catalogue')).status,503);
 assert.equal(comingSoonResponse(new Request('https://www.jamloom.com/',{method:'POST'})).status,503);
 assert.equal(await comingSoonResponse(new Request('https://www.jamloom.com/',{method:'HEAD'})).text(),'');
});
test('anonymous requests cannot bypass the default gate with request headers or query flags',async()=>{
 const response=await proxy(new NextRequest('https://www.jamloom.com/api/generations?admin=true',{headers:{'x-admin':'true','x-user-email':'serhan.sari@yahoo.com'}}));
 assert.equal(response.status,503);assert.match(await response.text(),/Jamloom is coming soon/);
});

test('Apple notification URLs reach signature verification during launch and maintenance holds',async()=>{
 const previous={...process.env};
 try{
  Object.assign(process.env,{DATABASE_URL:'postgresql://fixture@127.0.0.1:1/never-connect',BETTER_AUTH_URL:'http://127.0.0.1:3000',BETTER_AUTH_SECRET:'isolated-notification-routing-secret',JAMLOOM_LOCAL_OUTBOX:'/tmp/jamloom-notification-routing'});
  delete process.env.VERCEL;
  for(const path of ['/api/payments/apple','/api/payments/apple/notifications','/api/payments/apple/notifications/sandbox']){
   assert.equal(comingSoonRecovery(path),true);
   const response=await proxy(new NextRequest('https://www.jamloom.com'+path,{method:'POST'}));
   assert.equal(response.headers.get('x-middleware-next'),'1','Webhooks must not query maintenance/session state before signature verification');
  }
  for(const path of ['/api/payments/apple/fake','/api/payments/apple/notifications/fake','/api/payments/apple/notifications/sandbox/fake'])assert.equal(comingSoonRecovery(path),false);
 }finally{for(const key of Object.keys(process.env))if(!(key in previous))delete process.env[key];Object.assign(process.env,previous);}
});

test('published Live DJ preview is accessible while other product routes remain gated',async()=>{
 assert.equal(comingSoonRecovery('/live-dj'),true);
 assert.equal(comingSoonRecovery('/live-dj/fake'),false);
 assert.equal(comingSoonRecovery('/improvise'),false);
 assert.equal(comingSoonRecovery('/api/generations'),false);
 const response=await proxy(new NextRequest('https://www.jamloom.com/live-dj'));
 assert.equal(response.headers.get('x-middleware-next'),'1');
 assert.match(await comingSoonResponse(new Request('https://www.jamloom.com/')).text(),/href="\/live-dj">Download free Basic for Mac/);
});

// The route still enforces CRON_SECRET and the reviewed database identity.
test('retention cron reaches its own authorization while launch access stays closed',async()=>{
 assert.equal(comingSoonRecovery('/api/maintenance'),true);
 assert.equal(comingSoonRecovery('/api/maintenance/fake'),false);
 const response=await proxy(new NextRequest('https://www.jamloom.com/api/maintenance'));
 assert.equal(response.headers.get('x-middleware-next'),'1');
});

test('free Local Remixes opens directly while cloud creation remains gated',async()=>{
 assert.equal(comingSoonRecovery('/studio/index.html'),true);
 for(const path of ['/studio/index.html/fake','/api/improvise/song','/api/generations','/api/payments/checkout'])assert.equal(comingSoonRecovery(path),false,path);
 const response=await proxy(new NextRequest('https://www.jamloom.com/studio/index.html'));
 assert.equal(response.headers.get('x-middleware-next'),'1');
 const html=await comingSoonResponse(new Request('https://www.jamloom.com/')).text();
 assert.ok(html.includes('href="/studio/index.html">Try Local Remixes free'));
 assert.match(html,/id="local-remixes"/);
});

test('DJ cleanup reaches its own auth during a launch hold without opening session APIs',async()=>{
 assert.equal(comingSoonRecovery('/api/ai-dj/supervisor'),true);
 assert.equal(comingSoonRecovery('/api/ai-dj/supervisor/fake'),false);
 const response=await proxy(new NextRequest('https://www.jamloom.com/api/ai-dj/supervisor'));
 assert.equal(response.headers.get('x-middleware-next'),'1');
});

// Advertising the product must not open generation, recordings, or payment access.
test('AI DJ public overview passes the launch hold while paid and private APIs remain closed',async()=>{
 assert.equal(comingSoonRecovery('/ai-dj', {NODE_ENV:'production'}),true);
 for(const path of ['/ai-dj/session','/ai-dj/fake','/api/ai-dj/sessions','/api/ai-dj/recordings','/api/payments/checkout'])assert.equal(comingSoonRecovery(path,{NODE_ENV:'production'}),false,path);
 assert.equal((await proxy(new NextRequest('https://www.jamloom.com/ai-dj'))).headers.get('x-middleware-next'),'1');
 const html=await comingSoonResponse(new Request('https://www.jamloom.com/')).text();
 assert.match(html,/href="\/ai-dj">AI DJ<\/a>/);assert.match(html,/product-previews\/ai-dj.webp/);
 assert.match(html,/Explore AI DJ/);
});

test('public preview images bypass the launch proxy while private and payment routes stay covered',async()=>{
 const assets=await readdir(new URL('../public/product-previews/',import.meta.url));
 assert.ok(assets.some(name=>name.endsWith('.webp')));
 for(const name of assets){
  assert.equal(doesProxyMatch({config,url:'/product-previews/'+name}),false,name);
  assert.equal(doesProxyMatch({config,url:'/product-previews/'+name+'?v=1'}),false,name+' with query');
 }
 for(const url of ['/api/payments/checkout','/api/generations','/api/taste/song?view=mine','/account/credits','/admin'])
  assert.equal(doesProxyMatch({config,url}),true,url);
});

test('credits account page reaches its own authentication during preview without opening purchases',async()=>{
 assert.equal(comingSoonRecovery('/account/credits'),true);
 assert.equal((await proxy(new NextRequest('https://www.jamloom.com/account/credits'))).headers.get('x-middleware-next'),'1');
 for(const path of ['/api/payments/checkout','/api/payments/subscription','/account/credits/fake'])
  assert.equal((await proxy(new NextRequest('https://www.jamloom.com'+path))).status,path.startsWith('/api/')?503:307,path);
});

test('Apple receipt recovery reaches authenticated verification during preview while new checkout stays closed',async()=>{
 assert.equal(comingSoonRecovery('/api/payments/apple'),true);
 const response=await proxy(new NextRequest('https://www.jamloom.com/api/payments/apple',{method:'POST',body:'{"action":"account-token"}'}));
 assert.equal(response.headers.get('x-middleware-next'),'1');
 for(const path of ['/api/payments/apple/fake','/api/payments/checkout','/api/payments/subscription'])
  assert.equal((await proxy(new NextRequest('https://www.jamloom.com'+path,{method:'POST'}))).status,503,path);
});


test('product browsing opens the requested workspace while generation and purchase mutations remain closed',async()=>{
 const pages=['/music-dna','/improvise','/academy','/academy/learn','/academy/levels/beginner','/academy/lessons/first-crossfade','/academy/practice','/academy/challenges/first-crossfade','/singing-academy','/singing-academy/warmups','/singing-academy/lessons/first-light'];
 const reads=['/api/taste/song','/api/improvise/song','/api/taste/song?view=mine','/api/improvise/song?view=mine&language=en','/api/academy/lesson/first-crossfade','/api/academy/progress','/api/singing-course','/api/singing-recordings/first-song/karaoke'];
 for(const path of [...pages,...reads]){
  const request=new NextRequest('https://www.jamloom.com'+path);
  assert.equal(publicProductRead(request),true,path);
  const response=await proxy(request);assert.equal(response.headers.get('x-middleware-next'),'1',path);assert.equal(response.headers.get('location'),null,path);
  for(const method of ['POST','PUT','DELETE']){const mutation=await proxy(new NextRequest(request.url,{method}));if(path==='/api/academy/progress')assert.equal(mutation.headers.get('x-middleware-next'),'1');else assert.equal(mutation.status,503,method+' '+path);}
 }
 for(const path of ['/api/payments/checkout','/api/academy/checkout','/api/generations','/api/library','/academy/unknown/path','/music-dna/fake','/api/taste/song?id='+'a'.repeat(32),'/api/academy/lesson/first-crossfade/extra'])assert.equal(publicProductRead(new Request('https://www.jamloom.com'+path)),false,path);
});


test('operating cron reaches its own authorization through launch holds and an unavailable maintenance database',async()=>{
 const previous={...process.env};
 try{
  Object.assign(process.env,{DATABASE_URL:'postgresql://fixture@127.0.0.1:1/never-connect',BETTER_AUTH_URL:'http://127.0.0.1:3000',BETTER_AUTH_SECRET:'isolated-operations-routing-secret',JAMLOOM_LOCAL_OUTBOX:'/tmp/jamloom-operations-routing'});
  delete process.env.VERCEL;
  for(const gate of ['true','false']){
   process.env.JAMLOOM_COMING_SOON=gate;
   const response=await proxy(new NextRequest('https://www.jamloom.com/api/operations'));
   assert.equal(response.headers.get('x-middleware-next'),'1','The monitor must reach its authenticated route without querying maintenance state');
  }
  assert.equal(comingSoonRecovery('/api/operations/fake'),false);
 }finally{for(const key of Object.keys(process.env))if(!(key in previous))delete process.env[key];Object.assign(process.env,previous);}
});
