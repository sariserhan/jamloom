import {read,save,control,endpoint} from './deployed-common.mts';
const state=await read('style-control-state.json'),start=new Date(state.activatedAt);start.setUTCMinutes(0,0,0);
const params=new URLSearchParams({serverlessId:endpoint,bucketSize:'hour',startTime:start.toISOString(),endTime:new Date().toISOString()});
const receipt=await control('billing/serverless?'+params);
await save('endpoint-billing.json',{status:'PROVISIONAL',at:new Date().toISOString(),scope:'This endpoint in the complete UTC buckets overlapping this bounded diagnostic; no other endpoint work was active in this window',finalInvoice:false,missingRowsAreNotZero:true,mutations:false,receipt});
console.log(JSON.stringify({status:'PROVISIONAL',records:receipt.records?.length,totals:receipt.metadata?.totals,finalInvoice:false}));
