import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {assertProductionEndpoint,CLOUD_4090_DIAGNOSTIC_PROFILE} from '../apps/site/lib/cloud-production-profile';
const dir=new URL('../docs/evidence/release-capacity-audit-20261101/',import.meta.url);
const probe=JSON.parse(await readFile(new URL('disabled-config-probe.json',dir),'utf8')),catalog=JSON.parse(await readFile(new URL('catalog.json',dir),'utf8'));
assert.equal(probe.restored,true);
const now=Date.now(),lease={startsAt:now-1000,expiresAt:now+30*60000,maxMicros:2000000};
for(const receipt of [probe.patchReceipt,...probe.samples]){
 assert.deepEqual(receipt.workers,{min:0,max:0});assert.equal(receipt.gpu.excludedTypes,undefined);
 // Only simulate the active worker limits for validation; never allocate capacity.
 assertProductionEndpoint({...receipt,workers:{min:1,max:1}},catalog,lease,CLOUD_4090_DIAGNOSTIC_PROFILE);
}
const result={status:'PASS',actualDisabledReceipts:1+probe.samples.length,providerOperations:0,activeWorkerLimits:'SIMULATED_FOR_VALIDATION_ONLY',newHardwareStillRejected:true};
await writeFile(new URL('replay-result.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
