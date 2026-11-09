import test from 'node:test';import assert from 'node:assert/strict';
import {operationAlerts,sendOperationAlert,type OperationSnapshot} from '../lib/operations-monitor';
import {inspectProviderAutoPay} from '../lib/provider-replenishment';
const healthy:OperationSnapshot={now:1000000000,expiresAt:1000000000+7*86400000,remainingMicros:10000000,cycleMicros:750000,guardianOK:true,shutdownFailed:false,providerMismatch:false,workers:0,liveFailures:0,overdueCleanup:0};
test('healthy service is quiet; low, exhausted and expiring allowance are actionable',()=>{
 assert.deepEqual(operationAlerts(healthy),[]);assert.deepEqual(operationAlerts({...healthy,remainingMicros:1500000}),['budget-low']);assert.deepEqual(operationAlerts({...healthy,remainingMicros:500000}),['budget-unavailable']);assert.deepEqual(operationAlerts({...healthy,expiresAt:healthy.now+86400000}),['budget-expiring']);
});
test('failed shutdown, stale guardian, identity mismatch and failed song/cleanup are detected',()=>{
 assert.deepEqual(operationAlerts({...healthy,guardianOK:false,shutdownFailed:true,liveFailures:1}),['guardian-stale','shutdown-unconfirmed','generation-failed']);
 assert.deepEqual(operationAlerts({...healthy,providerMismatch:true}),['shutdown-unconfirmed']);assert.deepEqual(operationAlerts({...healthy,overdueCleanup:1}),['generation-failed']);
});
test('expired permit with zero workers is safe shutdown; remaining workers alert independently',()=>{
 assert.deepEqual(operationAlerts({...healthy,expiresAt:healthy.now,guardianOK:false}),['budget-unavailable']);assert.deepEqual(operationAlerts({...healthy,expiresAt:healthy.now,workers:1}),['budget-unavailable','shutdown-unconfirmed']);
});
test('two monitors share stable idempotency, repeat incidents bounded and payload excludes customer records',async()=>{
 const sent:any[]=[];const request:any=async(url:string,options:any)=>{sent.push({url,...options});return Response.json({id:'delivery'});};const env={JAMLOOM_OPERATIONS_EMAIL:'owner@example.test',EMAIL_FROM:'Jamloom <ops@example.test>',RESEND_API_KEY:'test-key'};
 await sendOperationAlert('guardian-stale',env,request,1000);await sendOperationAlert('guardian-stale',env,request,2000);await sendOperationAlert('guardian-stale',env,request,21601000);
 assert.equal(sent[0].headers['Idempotency-Key'],sent[1].headers['Idempotency-Key']);assert.notEqual(sent[1].headers['Idempotency-Key'],sent[2].headers['Idempotency-Key']);assert.equal(sent[0].body,sent[2].body);assert.match(JSON.parse(sent[0].body).text,/heartbeat/);
});
test('transport failure remains a failure; missing address never silently sends elsewhere',async()=>{
 await assert.rejects(sendOperationAlert('test',{},async()=>Response.json({id:'no'}) as never));
 await assert.rejects(sendOperationAlert('test',{JAMLOOM_OPERATIONS_EMAIL:'owner@example.test',EMAIL_FROM:'ops@example.test',RESEND_API_KEY:'test'},async()=>new Response(null,{status:500})),/500/);
});
test('approved native reload suppresses manual recharge reminders without increasing funded capacity',()=>{
 const s={...healthy,revenueMicros:15000000,providerMicros:1000000,providerAutoPay:{enabled:true,amountUSD:25,thresholdUSD:10,matchesApprovedPolicy:true}};
 assert.deepEqual(operationAlerts(s),[]);
 assert.deepEqual(operationAlerts({...s,remainingMicros:0}),['budget-unavailable']);
 assert.deepEqual(operationAlerts({...s,providerAutoPay:{...s.providerAutoPay,thresholdUSD:100,matchesApprovedPolicy:false}}),['provider-autopay-mismatch']);
 const {providerAutoPay,...manual}=s;assert.deepEqual(operationAlerts(manual),['provider-recharge-ready']);
});
test('native reload verification reads exact approved settings and refuses malformed or failed evidence',async()=>{
 const env={JAMLOOM_PROVIDER_AUTO_PAY_POLICY:'25-below-10',RUNPOD_API_KEY:'test'};let calls=0;
 const request:any=async(url:string,options:RequestInit)=>{calls++;assert.equal(url,'https://api.runpod.io/graphql');assert.match(String(options.body),/query/);assert.doesNotMatch(String(options.body),/mutation/);return Response.json({data:{myself:{isAutoPayEnabled:true,stripeAutoReloadAmount:25,stripeAutoPaymentThreshold:10}}});};
 assert.equal(await inspectProviderAutoPay({},request),undefined);assert.equal(calls,0);
 assert.deepEqual(await inspectProviderAutoPay(env,request),{enabled:true,amountUSD:25,thresholdUSD:10,matchesApprovedPolicy:true});
 for(const value of [{isAutoPayEnabled:false,stripeAutoReloadAmount:25,stripeAutoPaymentThreshold:10},{isAutoPayEnabled:true,stripeAutoReloadAmount:25,stripeAutoPaymentThreshold:100}]){
  assert.equal((await inspectProviderAutoPay(env,async()=>Response.json({data:{myself:value}})))?.matchesApprovedPolicy,false);
 }
 await assert.rejects(inspectProviderAutoPay(env,async()=>new Response(null,{status:503})),/read failed/);
 await assert.rejects(inspectProviderAutoPay(env,async()=>Response.json({data:{myself:{isAutoPayEnabled:true,stripeAutoReloadAmount:'25',stripeAutoPaymentThreshold:10}}})),/Invalid/);
 await assert.rejects(inspectProviderAutoPay({...env,JAMLOOM_PROVIDER_AUTO_PAY_POLICY:'unlimited'},request),/Invalid/);
});
