import test from 'node:test';
import assert from 'node:assert/strict';
import {targetDraft} from '../scripts/fixtures/produced-target-draft.js';
const source={id:'long-way-home',sha256:'a'.repeat(64),seconds:120};
const draft={recordingId:source.id,recordingSha256:source.sha256,words:[{at:1,end:2,text:'Home'}],notes:[{at:1,end:2,note:57}]};
test('exports source-bound edits without promoting claimed verification or scores',()=>{
 const result=targetDraft({...draft,verified:true,scoringEnabled:true,score:100},source);
 assert.equal(result.verified,false);assert.equal(result.scoringEnabled,false);assert.equal(result.score,undefined);
 assert.deepEqual(result.words,draft.words);assert.deepEqual(result.notes,draft.notes);
 assert.equal(draft.verified,undefined);
});
test('rejects wrong source, out-of-bounds, overlapping and invalid word/note edits',()=>{
 for(const value of [{...draft,recordingId:'other'},{...draft,recordingSha256:'b'.repeat(64)},
  {...draft,notes:[{at:1,end:121,note:57}]},{...draft,notes:[{at:1,end:2,note:57.5}]},
  {...draft,words:[{at:1,end:2,text:'Home'},{at:1.5,end:3,text:'again'}]},
  {...draft,words:[{at:1,end:1,text:'Home'}]},{...draft,words:[{at:1,end:2,text:'\u0000'}]}])
  assert.throws(()=>targetDraft(value,source));
 assert.equal(targetDraft({...draft,notes:[{at:1,end:2,note:null}]},source).notes[0].note,null);
});
