import {writeFile} from 'node:fs/promises';
process.loadEnvFile('.env.local');
const get=async path=>{const r=await fetch('https://rest.runpod.io/v1/'+path,{headers:{Authorization:'Bearer '+process.env.RUNPOD_API_KEY},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Read-only control HTTP '+r.status);return r.json();};
const endpoint=await get('endpoints/'+process.env.RUNPOD_ENDPOINT_ID);
const template=await get('templates/'+endpoint.templateId+'?includeEndpointBoundTemplates=true');
await writeFile('../../docs/evidence/spleeter-local-20261027/hosted-readonly.json',JSON.stringify({at:new Date().toISOString(),name:endpoint.name,workersMin:endpoint.workersMin,workersMax:endpoint.workersMax,image:template.imageName,operation:'GET only',latestCodeQualified:false},null,2)+'\n');
console.log('PASS read-only snapshot retained');
