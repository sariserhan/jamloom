import test from 'node:test';import assert from 'node:assert/strict';
import {djRecordingKey,djSessionStore,checkedRecordingParts,DJ_PART_BYTES} from '../lib/dj-session-store';
test('session storage separates owners, sessions and codecs; rejects unbound configuration',()=>{
 const id='a'.repeat(32),a=djRecordingKey('owner-a',id,'audio/mp4');
 assert.notEqual(a,djRecordingKey('owner-b',id,'audio/mp4'));assert.notEqual(a,djRecordingKey('owner-a','b'.repeat(32),'audio/mp4'));assert.ok(!a.includes('owner-a'));
 assert.match(a,/^private\/[a-f0-9]{64}\/[a-f0-9]{32}\/set.m4a$/);
 assert.throws(()=>djRecordingKey('',id,'audio/mp4'));assert.throws(()=>djRecordingKey('owner','../escape','audio/mp4'));assert.throws(()=>djSessionStore({R2_AI_DJ_BUCKET:'jamloom-audio'}));
});
test('multipart finalization requires all contiguous equally sized parts and exact total',()=>{
 const parts=[{PartNumber:1,ETag:'"'+'a'.repeat(32)+'"',Size:DJ_PART_BYTES},{PartNumber:2,ETag:'b'.repeat(32),Size:200}];
 assert.equal(checkedRecordingParts(parts,2,DJ_PART_BYTES+200).length,2);
 assert.equal(checkedRecordingParts([{...parts[1],PartNumber:1}],1,200).length,1);
 for(const bad of [[parts[1],parts[0]],[{...parts[0],Size:5},parts[1]],[parts[0],{...parts[1],ETag:'invalid'}],[parts[0],{...parts[1],Size:NaN}]])assert.throws(()=>checkedRecordingParts(bad,2,DJ_PART_BYTES+200));
 assert.throws(()=>checkedRecordingParts(parts,2,DJ_PART_BYTES+201));assert.throws(()=>checkedRecordingParts(parts,3,DJ_PART_BYTES+200));assert.throws(()=>checkedRecordingParts([],0,0));
});

test('invalid multipart requests fail before provider access',async()=>{
 const store=djSessionStore({R2_AI_DJ_BUCKET:'jamloom-ai-dj-sessions',R2_ACCOUNT_ID:'a'.repeat(32),R2_ACCESS_KEY_ID:'test-only',R2_SECRET_ACCESS_KEY:'test-only'}),key=djRecordingKey('owner','a'.repeat(32),'audio/mp4');
 await assert.rejects(store.begin(key,'audio/webm;codecs=opus'),/format mismatch/);
 await assert.rejects(store.partURL(key,'upload',0,10),/part bounds/);
 await assert.rejects(store.partURL(key,'upload',1,DJ_PART_BYTES+1),/part bounds/);
 await assert.rejects(store.complete(key,'upload',1,NaN),/final recording bounds/);
 await assert.rejects(store.complete(key,'upload',10001,100),/final recording bounds/);
 await assert.rejects(store.abort('../another-user','upload'),/recording key/);
});
