import test from 'node:test';import assert from 'node:assert/strict';
import {trialBatch} from '../scripts/cloud-trial-progress';
test('one-worker trial cannot dispatch later requests while a prior result is running or unverified',()=>{
 const requests=[{id:1,state:'running',saved:false},{id:2,state:'queued',saved:false},{id:3,state:'queued',saved:false}];
 assert.deepEqual(trialBatch(requests,1).map(r=>r.id),[1]);
 requests[0].state='completed';assert.deepEqual(trialBatch(requests,1).map(r=>r.id),[1]);
 requests[0].saved=true;assert.deepEqual(trialBatch(requests,1).map(r=>r.id),[2]);
 requests[1].state='failed';assert.throws(()=>trialBatch(requests,1),/stopped/);
});
test('failed/cancelled or repeatedly unreadable results stop additional dispatch; worker bounds hold',()=>{
 for(const failure of [{state:'failed'},{state:'cancelled'},{pollErrors:3}])assert.throws(()=>trialBatch([failure,{}],1));
 assert.equal(trialBatch([{state:'running'},{state:'queued'},{}],2).length,2);
 assert.deepEqual(trialBatch([{state:'completed',saved:true}],1),[]);
 for(const workers of [0,3,1.5,NaN])assert.throws(()=>trialBatch([{}],workers));
});
