import test from 'node:test';
import assert from 'node:assert/strict';
import {appleReviewAccount,accountCreditLive} from '../lib/apple-review';
test('App Review ledger selection requires an explicit authenticated account and unexpired operator configuration',()=>{
 const now=Date.now(),env={CREDIT_BILLING_MODE:'live',JAMLOOM_APPLE_REVIEW_ENABLED:'true',JAMLOOM_APPLE_REVIEW_USER_IDS:'review-owner',JAMLOOM_APPLE_REVIEW_EXPIRES_AT:new Date(now+86400000).toISOString()};
 assert.equal(appleReviewAccount('review-owner',env,now),true);assert.equal(accountCreditLive('review-owner',env),false);
 assert.equal(appleReviewAccount('customer',env,now),false);assert.equal(accountCreditLive('customer',env),true);
 assert.equal(appleReviewAccount('review-owner',{...env,JAMLOOM_APPLE_REVIEW_ENABLED:'false'},now),false);
 assert.equal(appleReviewAccount('review-owner',env,now+86400000),false);
 assert.equal(appleReviewAccount('review-owner',{...env,JAMLOOM_APPLE_REVIEW_EXPIRES_AT:new Date(now+31*86400000).toISOString()},now),false);
 for(const patch of [{JAMLOOM_APPLE_REVIEW_USER_IDS:''},{JAMLOOM_APPLE_REVIEW_USER_IDS:'owner,owner'},{JAMLOOM_APPLE_REVIEW_USER_IDS:'a,b,c,d,e,f'},{JAMLOOM_APPLE_REVIEW_EXPIRES_AT:'invalid'}])assert.throws(()=>appleReviewAccount('review-owner',{...env,...patch},now));
});
