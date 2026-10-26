import test from 'node:test';import assert from 'node:assert/strict';import {djBetaAllowed,djBillingLive} from '../lib/dj-beta-access';
test('private beta is closed by default and accepts only explicitly invited verified accounts',()=>{const user={email:'Invited@example.test',emailVerified:true},env={NODE_ENV:'production',JAMLOOM_AI_DJ_BETA_ENABLED:'true',JAMLOOM_AI_DJ_BETA_EMAILS:' invited@example.test '};assert.equal(djBetaAllowed(user,{NODE_ENV:'production'}),false);assert.equal(djBetaAllowed(user,env),true);assert.equal(djBetaAllowed({...user,emailVerified:false},env),false);assert.equal(djBetaAllowed({...user,email:'other@example.test'},env),false);assert.equal(djBetaAllowed(null,env),false);assert.equal(djBetaAllowed(user,{...env,JAMLOOM_AI_DJ_BETA_EMAILS:'*'}),false);assert.equal(djBetaAllowed(user,{...env,JAMLOOM_AI_DJ_BETA_EMAILS:Array(51).fill(user.email).join(',')}),false);assert.equal(djBetaAllowed(null,{NODE_ENV:'development'}),true);});

test('DJ billing requires an explicit matching live setting and otherwise keeps test allowance',()=>{
 assert.equal(djBillingLive({CREDIT_BILLING_MODE:'live'}),false);
 assert.equal(djBillingLive({JAMLOOM_AI_DJ_BILLING_MODE:'test',CREDIT_BILLING_MODE:'live'}),false);
 assert.equal(djBillingLive({JAMLOOM_AI_DJ_BILLING_MODE:'live',CREDIT_BILLING_MODE:'live'}),true);
 assert.throws(()=>djBillingLive({JAMLOOM_AI_DJ_BILLING_MODE:'live',CREDIT_BILLING_MODE:'test'}),/requires live/);
 assert.throws(()=>djBillingLive({JAMLOOM_AI_DJ_BILLING_MODE:'invalid'}),/Invalid/);
});
