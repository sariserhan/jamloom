import test from 'node:test';
import assert from 'node:assert/strict';
import {germanJazzFixture,verifyGermanJazzReceipt} from '../scripts/german-jazz-fixture';
const fixture={version:1,seed:998959027,seconds:134,reference:'Take Five — Dave Brubeck',genre:'Jazz',language:'de',failedJobId:'a'.repeat(32),sourceProofPath:'docs/evidence/diagnostic/result.json',sourceProofSHA256:'b'.repeat(64)};
test('diagnostic preserves the failed seed and duration instead of the older default case',()=>{
 const parsed=germanJazzFixture(fixture);assert.equal(parsed.seed,998959027);assert.equal(parsed.seconds,134);
 assert.equal(parsed.failedJobId,fixture.failedJobId);assert.equal(parsed.sourceProofSHA256,fixture.sourceProofSHA256);
});
test('diagnostic rejects out-of-scope language, genre and reference',()=>{
 for(const override of [{language:'en'},{genre:'Metal'},{reference:'Another reference'}])assert.throws(()=>germanJazzFixture({...fixture,...override}));
});
test('diagnostic enforces product duration and reproducible unsigned seeds',()=>{
 for(const seconds of [0,99,141,134.5,NaN])assert.throws(()=>germanJazzFixture({...fixture,seconds}));
 for(const seed of [-1,2**32,1.5,NaN])assert.throws(()=>germanJazzFixture({...fixture,seed}));
 for(const seconds of [100,140])for(const seed of [0,0xffffffff])assert.equal(germanJazzFixture({...fixture,seconds,seed}).seconds,seconds);
});
test('diagnostic requires a valid source receipt identity and digest',()=>{
 for(const override of [{failedJobId:''},{failedJobId:'../secret'},{sourceProofSHA256:''},{sourceProofPath:'docs/evidence/../../secret.json'},{version:2}])assert.throws(()=>germanJazzFixture({...fixture,...override}));
 for(const value of [null,[],undefined])assert.throws(()=>germanJazzFixture(value));
});
test('diagnostic is bound to the exact failed style receipt, not another request or success',()=>{
 const f=germanJazzFixture(fixture),row={id:f.failedJobId,product:'music-dna',state:'failed',providerStatus:'FAILED',failedSeed:f.seed,durationSeconds:f.seconds,failure:'style-rejected:matched-2-of-4'};
 verifyGermanJazzReceipt(f,{status:'FAIL',requests:[row]});
 for(const override of [{id:'c'.repeat(32)},{failedSeed:1},{durationSeconds:100},{state:'completed'},{failure:'worker-timeout'}])assert.throws(()=>verifyGermanJazzReceipt(f,{status:'FAIL',requests:[{...row,...override}]}));
});
