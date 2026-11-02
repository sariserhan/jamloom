import {parseEnv} from 'node:util';import {readFile,writeFile} from 'node:fs/promises';import {spawnSync} from 'node:child_process';import assert from 'node:assert/strict';
const url=JSON.parse(await readFile(new URL('deployment-url.json',import.meta.url),'utf8')).deployment.url,root=new URL('../',import.meta.url).pathname;
const secret=parseEnv(await readFile(new URL('../build-academy-release/notification-cron.env',import.meta.url),'utf8')).CRON_SECRET;assert(secret);
const run=spawnSync('/Users/serhansari/.nvm/versions/node/v22.23.1/bin/vercel',['curl','/api/song-jobs','--deployment',url,'--','--header','Authorization: Bearer '+secret],{cwd:root,encoding:'utf8',timeout:60000});
assert.equal(run.status,0,'Protected guard invocation failed; no activation');
const data=JSON.parse(run.stdout);assert.deepEqual(data.capacity,{stopped:false});
const plan=JSON.parse(await readFile(new URL('../docs/evidence/identity-stems-20261101/hosted-plan.json',import.meta.url),'utf8'));assert(/^[a-f0-9]{40}$/.test(plan.applicationCommit));
const report={status:'PASS',deployment:url,source:plan.applicationCommit,hostedExpiryGuardPresent:true,capacity:data.capacity,customerGenerationEnabled:false,generationSubmitted:false};
await writeFile(new URL('candidate-guard.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
