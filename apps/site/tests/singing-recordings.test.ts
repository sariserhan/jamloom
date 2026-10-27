import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GET} from '../app/api/singing-recordings/[id]/[kind]/route';
import {GET as lesson} from '../app/singing-academy/lessons/[id]/route';
import {singingRecordings,recordingAsset} from '../../web/singing-recordings.js';
import {prepareSingingRecordings} from '../scripts/prepare-singing-recordings.mjs';

test('recordings use exact retained assets and protect audio and lyrics with course access',async()=>{
 await prepareSingingRecordings();
 const manifest=JSON.parse(await readFile('../../assets/singing-recordings/manifest.json','utf8'));
 const previous=process.env.SINGING_STRIPE_SANDBOX_ENABLED;
 try{
  delete process.env.SINGING_STRIPE_SANDBOX_ENABLED;
  for(const song of singingRecordings)for(const kind of ['song','karaoke','lyrics']){
   const params=Promise.resolve({id:song.id,kind}),response=await GET(new Request('http://localhost'+recordingAsset(song.id,kind)),{params});
   assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(response.headers.get('vary'),'Cookie');
   const data=Buffer.from(await response.arrayBuffer());assert.equal(createHash('sha256').update(data).digest('hex'),manifest.songs.find((s:any)=>s.id===song.id).files[kind].sha256);
   if(kind!=='lyrics'){
    const part=await GET(new Request('http://localhost',{headers:{Range:'bytes=100-199'}}),{params});assert.equal(part.status,206);assert.equal(part.headers.get('content-type'),'audio/mpeg');assert.equal((await part.arrayBuffer()).byteLength,100);
   }
  }
  for(const [id,kind] of [['../private','song'],['long-way-home','../../private'],['missing','karaoke']])assert.equal((await GET(new Request('http://localhost'),{params:Promise.resolve({id,kind})})).status,404);
  const params=Promise.resolve({id:'long-way-home',kind:'song'});
  assert.equal((await GET(new Request('http://localhost',{headers:{Range:'bytes=2-1'}}),{params})).status,416);
  assert.equal((await GET(new Request('http://localhost',{headers:{Range:'bytes=bad'}}),{params})).status,416);
  process.env.SINGING_STRIPE_SANDBOX_ENABLED='true';assert(!process.env.DATABASE_URL,'This denial check requires no database');
  for(const kind of ['song','karaoke','lyrics'])assert.equal((await GET(new Request('http://localhost'),{params:Promise.resolve({id:'long-way-home',kind})})).status,403);
  assert.equal((await lesson(new Request('http://localhost'),{params:Promise.resolve({id:'long-way-home'})})).status,303);
 }finally{if(previous===undefined)delete process.env.SINGING_STRIPE_SANDBOX_ENABLED;else process.env.SINGING_STRIPE_SANDBOX_ENABLED=previous;}
});
