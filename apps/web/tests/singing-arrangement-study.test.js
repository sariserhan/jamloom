import test from 'node:test';import assert from 'node:assert/strict';
import {revisedSong,revisedScore} from '../../../scripts/experiments/singing-arrangements.mjs';
import {singingSongs,phraseFor} from '../singing-course.js';
import {SingingScore} from '../singing-score.js';
import {SingingPhrase,frequencyFor} from '../singing-lesson.js';
test('original-song drafts preserve full lyrics, valid section practice and exact grading at every supported register',()=>{
 const before=JSON.stringify(singingSongs);
 for(const id of ['paper-kites','neon-tide']){
  const index=singingSongs.findIndex(s=>s.id===id),original=singingSongs[index],song=revisedSong(original);singingSongs[index]=song;
  try{
   assert.deepEqual(song.lyrics.filter(Boolean),song.lines.flatMap(l=>l.split(' ')));assert.equal(song.notes.reduce((n,r)=>n+r[1],0),72);
   for(const root of [45,57,69])for(const tempo of [76,120,128])for(const section of ['all',0,1,2,3]){
    const phrase=phraseFor(song,root,tempo,section),events=revisedScore(song,phrase,root,48000,1,true);assert.doesNotThrow(()=>new SingingScore(48000,0,events));
    const grader=new SingingPhrase(phrase,48000,0),silent=new SingingPhrase(phrase,48000,0),end=phrase.at(-1).at+phrase.at(-1).duration;
    for(let frame=0;frame<=(end+.02)*48000;frame+=480){const n=phrase.find(n=>frame/48000>=n.at&&frame/48000<n.at+n.duration);grader.observe(frame,n?.note==null?null:{frequency:frequencyFor(n.note),confidence:1,rms:.1});silent.observe(frame,null);}
    assert(grader.result().passed,id);assert(!silent.result().passed);assert(!revisedScore(song,phrase,root,48000,1,false).some(e=>e.command.patch===0));
   }
  }finally{singingSongs[index]=original;}
 }
 assert.equal(JSON.stringify(singingSongs),before);
});
