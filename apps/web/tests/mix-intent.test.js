import test from 'node:test';
import assert from 'node:assert/strict';
import {mixIntent} from '../mix-intent.js';
const receipt={wav_sha256:'a'.repeat(64),sample_rate:48000,observed_context_start_frame:100,frames:48000};
const transport={...receipt,events:[{context_frame:200,action:'snapshot'}]};
const hold={context_frame:200,transport_event_index:0,kind:'hold',reason:'Let the vocal finish'};
test('explicit hold stays linked to the recorded clock and never grants training or expert status',()=>{
 const result=mixIntent([hold],receipt,transport);
 assert.equal(result.training_authorized,false);assert.equal(result.expert_verified,false);
 assert.equal(result.events[0].reason,hold.reason);assert.deepEqual(mixIntent([],receipt,transport).events,[]);
 for(const change of [{kind:'expert'},{reason:''},{context_frame:99},{context_frame:48200},{transport_event_index:1}])
  assert.throws(()=>mixIntent([{...hold,...change}],receipt,transport));
 assert.throws(()=>mixIntent([hold],receipt,{...transport,wav_sha256:'b'.repeat(64)}));
 assert.throws(()=>mixIntent(Array(129).fill(hold),receipt,transport));
});
