import test from 'node:test';import assert from 'node:assert/strict';
import {singingRecordings,recordingAsset} from '../singing-recordings.js';
import {singingSongs,readProgress} from '../singing-course.js';
test('produced songs preserve the graded course and cannot become fabricated passing scores',()=>{
 assert.equal(singingSongs.length,12);assert.equal(singingRecordings.length,2);
 for(const song of singingRecordings){assert(!singingSongs.some(s=>s.id===song.id));assert.equal(song.seconds,120);assert.match(recordingAsset(song.id,'karaoke',true),/^\.\/singing-audio\/.*-karaoke.mp3$/);}
 const storage={getItem:()=>JSON.stringify({'long-way-home':{best:100,attempts:1,passed:true}})};assert.deepEqual(readProgress(storage),{});
 for(const [id,kind] of [['../private','song'],['long-way-home','voice.wav'],['missing','karaoke']])assert.throws(()=>recordingAsset(id,kind));
});
