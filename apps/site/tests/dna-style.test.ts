import test from 'node:test';
import assert from 'node:assert/strict';
import {checkedDnaStyle} from '../lib/dna-style';
const hash='a'.repeat(64),fit={accepted:false,target:'jazz',audio_sha256:hash,technical:'PASS',delivery_policy:'style-guidance-v1',screen_version:1,matching_windows:1};
test('uncertain style is guidance only after the bound technical receipt passes',()=>{
 assert.equal(checkedDnaStyle(fit,hash,'jazz'),'uncertain');
 assert.equal(checkedDnaStyle({...fit,accepted:true},hash,'jazz'),'matched');
 assert.equal(checkedDnaStyle({accepted:true,target:'jazz',audio_sha256:hash},hash,'jazz'),'matched');
 for(const change of [{technical:'FAIL'},{accepted:true,technical:'FAIL',delivery_policy:undefined},{technical:undefined},{accepted:undefined},{delivery_policy:undefined},{delivery_policy:'unknown'},{audio_sha256:'b'.repeat(64)},{target:'rock'},{screen_version:2},{matching_windows:NaN},{matching_windows:5}])assert.throws(()=>checkedDnaStyle({...fit,...change},hash,'jazz'));
});
