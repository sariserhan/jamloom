import {test} from 'node:test';
import assert from 'node:assert/strict';
import {completionWindowSeconds} from '../scripts/cloud-trial-limits';
test('longer qualification keeps every stage under its existing three-dollar conservative budget',()=>{
 for(const [mode,requests]of [['improvise-completion',4],['dna-completion',2],['maximum-dna',1],['improvise-quality',1],['improvise-variety',3],['improvise-study',10]] as const){
  const seconds=completionWindowSeconds(true,mode,1200);assert.equal(seconds,2400);
  assert((seconds+130)*.001+requests*.02<3);
 }
});
test('diagnostics and historical modes cannot silently acquire a longer window',()=>{
 for(const mode of ['diagnostic','startup','repair','legacy','unknown'])assert.throws(()=>completionWindowSeconds(true,mode,1200));
 assert.equal(completionWindowSeconds(false,'diagnostic',1200),1200);
 assert.equal(completionWindowSeconds(false,'startup',720),720);
});
