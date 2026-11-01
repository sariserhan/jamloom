import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudSongConfig} from '../lib/cloud-song-config';
import {costDiagnosticConfig,trialSettlement} from '../scripts/cloud-cost-diagnostic';

test('candidate cost profiles fit catalog budgets without changing customer configuration or campaign limits',()=>{
 const base=cloudSongConfig({JAMLOOM_CLOUD_SONGS_ENABLED:'true',RUNPOD_API_KEY:'fixture',RUNPOD_ENDPOINT_ID:'fixture',JAMLOOM_CLOUD_RATE_MICROS_PER_SECOND:'1000',CREDIT_BILLING_MODE:'test'})!;
 const original=structuredClone(base);
 for(const [product,expected]of [['improvise',68400],['music-dna',138800]] as const){
  const candidate=costDiagnosticConfig(base,product);assert.equal(candidate.costCapMicros,expected);
  assert.equal(candidate.budget.fixedCostMicros+candidate.budget.maxRuntimeMs/1000*candidate.rate,expected);
  assert(candidate.ttlSeconds>candidate.executionSeconds);
 }
 assert.deepEqual(base,original);assert.equal(base.costCapMicros,920000);
 assert.throws(()=>costDiagnosticConfig({...base,live:true},'improvise'),/test ledger/);
});
test('hosted diagnostics require fixed catalog settlement and full failure refunds',()=>{
 for(const [product,credits]of [['improvise',10],['music-dna',20]] as const){
  assert.equal(trialSettlement(product,'completed',credits,{available:50-credits,reserved:0}).passed,true);
  assert.equal(trialSettlement(product,'completed',credits,{available:49,reserved:0}).passed,false);
  for(const state of ['failed','cancelled']){
   assert.equal(trialSettlement(product,state,credits,{available:50,reserved:0}).passed,true);
   assert.equal(trialSettlement(product,state,credits,{available:49,reserved:0}).passed,false);
  }
  assert.equal(trialSettlement(product,'completed',credits-1,{available:50-credits,reserved:0}).passed,false);
  assert.equal(trialSettlement(product,'failed',credits,{available:50,reserved:1}).passed,false);
 }
});
