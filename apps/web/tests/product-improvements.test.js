import test from 'node:test';import assert from 'node:assert/strict';
import {SingingRegister} from '../singing-register.js';
import {SingingPhrase,frequencyFor} from '../singing-lesson.js';
import {generationProgress} from '../generation-progress.js';
import {LessonRun} from '../academy-evaluator.js';
const pitch=note=>({frequency:frequencyFor(note),confidence:.99,rms:.1});
test('register check ignores silence, duplicate frames and outliers without saving audio',()=>{
 const a=new SingingRegister();for(let i=0;i<300;i++)a.observe(i*.05,null);assert.equal(a.result([0,4,7]),null);
 const b=new SingingRegister();for(let i=0;i<300;i++)b.observe(0,pitch(60));assert.equal(b.result([0,4,7]),null);
 for(let i=1;i<=200;i++)b.observe(i*.05,pitch(i%30===0?80:60));
 assert.deepEqual(b.result([0,4,7]),{root:57,low:60,high:60});assert.equal(b.result([null]),null);
 const c=new SingingRegister();for(let i=0;i<200;i++)c.observe(i*.05,pitch(48));assert.equal(c.result([0,4,7]).root,45);
});
test('octave advice changes guidance, never grading or acceptance',()=>{
 for(const [note,word] of [[45,'below'],[69,'above']]){const g=new SingingPhrase([{note:57,at:0,duration:2}],48000,0);let r;for(let i=0;i<=110;i++)r=g.observe(i*960,pitch(note));assert.equal(r.passed,false);assert.equal(r.score,0);assert.match(r.details[0].advice,new RegExp('octave '+word));}
});
test('credit release is stated only for settled failures and reconnection discourages duplicates',()=>{
 assert.match(generationProgress('failed',undefined,'released').detail,/Credit reservation released/);
 for(const state of ['failed','running','reconnecting'])assert.doesNotMatch(generationProgress(state).detail,/Credit reservation released/);
 assert.doesNotMatch(generationProgress('running',undefined,'released').detail,/Credit reservation released/);
 assert.match(generationProgress('reconnecting').detail,/rather than starting another/);
});
test('DJ practice suggestions come from actual failed checks without changing completion',()=>{
 const task={id:'knowledge',kind:'knowledge',objective:'Count the beat',control:'answer',answer:1,remediation:'Count four steady beats.',practice:'Tap along.',success:'Correct'};
 const run=new LessonRun({tasks:[task]});run.begin();assert.equal(run.verify().pass,false);assert.equal(run.recommendations()[0].attempts,1);assert.equal(run.results.length,0);
 run.begin();run.action({t:1,source:'user',control:'answer',value:1});assert.equal(run.verify().pass,true);run.next();assert.equal(run.state,'completed');assert.equal(run.recommendations()[0].advice,task.remediation);
});
