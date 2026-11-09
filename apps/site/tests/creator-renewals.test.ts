import test from 'node:test';import assert from 'node:assert/strict';
import {creatorRenewalsEnabled,protectCreatorRenewal,protectCreatorInvoice,protectCreatorRenewals} from '../lib/creator-renewals';
import {CREDIT_CATALOG_VERSION} from '../lib/credit-catalog';
const env={JAMLOOM_TEST_RENEWAL_PROTECTION:'true'};
function fixture(){
 const sub:any={id:'sub_one',customer:'cus_one',livemode:false,status:'active',metadata:{jamloom_product:'creator-subscription',jamloom_owner:'owner',catalog:CREDIT_CATALOG_VERSION}};
 const invoice:any={id:'in_one',customer:'cus_one',livemode:false,status:'draft',amount_paid:0,billing_reason:'subscription_cycle',parent:{subscription_details:{subscription:'sub_one'}}};
 const calls:any[]=[];
 const stripe:any={subscriptions:{retrieve:async()=>sub,update:async(id:string,p:any)=>{calls.push(['pause',p]);sub.pause_collection=p.pause_collection;return sub;},list:()=>({async *[Symbol.asyncIterator](){yield {...sub,metadata:{jamloom_product:'unrelated'}};yield sub;}})},invoices:{retrieve:async()=>invoice,update:async(id:string,p:any)=>{calls.push(['invoice-update',p]);return invoice;},finalizeInvoice:async(id:string,p:any)=>{calls.push(['finalize',p]);invoice.status='open';return invoice;},voidInvoice:async()=>{calls.push(['void']);invoice.status='void';return invoice;},list:({status}:any)=>({async *[Symbol.asyncIterator](){if(invoice.status===status)yield invoice;}})}};
 const pool:any={query:async()=>({rows:[{owner_id:'owner'}]})};return {sub,invoice,calls,stripe,pool};
}
test('live renewals require separate enabled and qualified approval; ordinary sandbox unchanged',()=>{
 assert.equal(creatorRenewalsEnabled(true,{}),false);assert.equal(creatorRenewalsEnabled(true,{JAMLOOM_CREATOR_RENEWALS_ENABLED:'true'}),false);assert.equal(creatorRenewalsEnabled(false,{}),true);assert.equal(creatorRenewalsEnabled(false,env),false);
});
test('pause future collections permanently without cancelling or modifying paid credits; duplicate is harmless',async()=>{
 const f=fixture();assert.equal(await protectCreatorRenewal(f.stripe,f.pool,'sub_one',false,env),true);await protectCreatorRenewal(f.stripe,f.pool,'sub_one',false,env);
 assert.deepEqual(f.calls,[['pause',{pause_collection:{behavior:'void'},metadata:{jamloom_renewal_hold:'operating-funding'}}]]);
});
test('unrelated, incomplete and cancelled subscriptions are untouched',async()=>{
 for(const state of ['incomplete','incomplete_expired','canceled']){const f=fixture();f.sub.status=state;assert.equal(await protectCreatorRenewal(f.stripe,f.pool,'sub_one',false,env),false);assert.equal(f.calls.length,0);}
 const f=fixture();f.sub.metadata.jamloom_product='other';assert.equal(await protectCreatorRenewal(f.stripe,f.pool,'sub_one',false,env),false);
});
test('environment and account mismatches fail before mutation',async()=>{
 for(const change of [(f:any)=>f.sub.livemode=true,(f:any)=>f.sub.metadata.jamloom_owner='someone-else',(f:any)=>f.sub.metadata.catalog='unknown']){
 const f=fixture();change(f);await assert.rejects(protectCreatorRenewal(f.stripe,f.pool,'sub_one',false,env));assert.equal(f.calls.length,0);}
});
test('first purchase invoices are untouched; renewal drafts disable auto collection before voiding',async()=>{
 const f=fixture();f.invoice.billing_reason='subscription_create';assert.equal(await protectCreatorInvoice(f.stripe,f.pool,'in_one',false,env),false);assert.equal(f.calls.length,0);
 f.invoice.billing_reason='subscription_cycle';assert.equal(await protectCreatorInvoice(f.stripe,f.pool,'in_one',false,env),true);
 assert.deepEqual(f.calls.slice(1),[['invoice-update',{auto_advance:false}],['finalize',{auto_advance:false}],['void']]);await protectCreatorInvoice(f.stripe,f.pool,'in_one',false,env);assert.equal(f.calls.length,4);
});
test('an already-paid renewal raises operator review rather than pretending it was prevented',async()=>{
 const f=fixture();f.invoice.status='paid';f.invoice.amount_paid=3500;await assert.rejects(protectCreatorInvoice(f.stripe,f.pool,'in_one',false,env),/already collected/);assert.equal(f.calls.some(c=>c[0]==='void'),false);
});
test('scheduled reconciliation protects related subscriptions and pending invoices only',async()=>{
 const f=fixture();assert.deepEqual(await protectCreatorRenewals(f.stripe,f.pool,false,env),{checked:1,protected:1});assert.equal(f.invoice.status,'void');
});
