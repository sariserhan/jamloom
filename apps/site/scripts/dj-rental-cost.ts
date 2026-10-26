import './env';
import {readFile,writeFile,stat} from 'node:fs/promises';
import {isAbsolute} from 'node:path';
import {integer} from '../lib/economics';
import {VastProvider} from '../lib/vast-provider';

// Read-only reconciliation of the entire rental, including startup, idle time and failed work.
const [statePath,accountText,output]=process.argv.slice(2),account=integer(Number(accountText),1);
if(!statePath||!isAbsolute(statePath)||!output||!isAbsolute(output))throw Error('Use /private/trial-state.json ACCOUNT /private/cost.json');
const meta=await stat(statePath);
if(meta.size>16384||(meta.mode&0o077)!==0)throw Error('Small private rental receipt required');
const state=JSON.parse(await readFile(statePath,'utf8'));
integer(state.id,1);
if(!/^jamloom-dj-(?:qualification|model-comparison)-[a-z0-9-]{1,80}$/.test(state.label)||!Number.isFinite(state.started_at)||!Number.isFinite(state.destroy_confirmed_at)||state.destroy_confirmed_at<=state.started_at)throw Error('Confirmed DJ shutdown receipt required');
const provider=new VastProvider(process.env.VASTAI_KEY??''),inventory=await provider.inventory(account);
if(inventory.some(i=>i.id===state.id||i.label===state.label))throw Error('Rental is still present');
const from=Math.floor(state.started_at/86400)*86400,to=(Math.floor(state.destroy_confirmed_at/86400)+1)*86400-1;
const cost=await provider.charges(account,state.id,state.label,from,to);
await writeFile(output,JSON.stringify(cost,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({instance:state.id,rentalSeconds:state.destroy_confirmed_at-state.started_at,observedProviderCostMicros:cost.observedCostMicros,evidenceSha256:cost.evidenceSha256,final:false,customerBillingChanged:false}));
