import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';

export async function claimStudyStage(root:string,permitPath:string,manifestHash:string,stage:number,receipt:string){
 const permit=JSON.parse(await readFile(permitPath,'utf8'));
 assert.equal(permit.status,'AUTHORIZED','Fresh explicit campaign approval is required');
 assert.equal(permit.campaign,'jamloom-neural-qualification-20261030');
 assert.equal(permit.manifest_sha256,manifestHash);assert.equal(permit.max_usd,21);
 assert.equal(permit.max_provider_requests,69);assert.equal(permit.stages,7);
 assert.equal(permit.max_workers,1);assert.equal(permit.max_stage_seconds,2400);
 assert.equal(permit.max_stage_usd,3);assert.equal(permit.retries,0);assert.equal(permit.stop_on_failure,true);
 assert(typeof permit.owner_statement==='string'&&permit.owner_statement.trim().length>0);
 assert(Number.isSafeInteger(stage)&&stage>=1&&stage<=7);
 assert(Object.keys(permit.file_sha256??{}).length>=4,'Pin the reviewed harness');
 for(const [path,sha]of Object.entries(permit.file_sha256)){
  assert.equal(createHash('sha256').update(await readFile(resolve(root,path))).digest('hex'),sha,'Reviewed harness changed: '+path);
 }
 const claims=resolve(root,'build-neural-qualification-20261030/claims');
 if(stage>1){
  const prior=JSON.parse(await readFile(resolve(claims,`stage-${stage-1}.json`),'utf8'));
  assert.equal(prior.manifest_sha256,manifestHash);
  const result=JSON.parse(await readFile(prior.receipt,'utf8'));
  assert.equal(result.studyStage,stage-1);assert.equal(result.studyManifestSha256,manifestHash);
  assert.equal(result.qualification,'PASS');assert.equal(result.cleanup,true);assert.equal(result.disabled,true);assert.equal(result.stopped,true);
  const check=JSON.parse(await readFile(resolve(claims,`stage-${stage-1}-postcheck.json`),'utf8'));
  assert.equal(check.receipt,prior.receipt);assert.equal(check.cleanup,'PASS');assert.equal(check.qualification,'PASS');
  assert.deepEqual(check.workerLimits,[0,0]);assert.equal(check.workers.summary.total,0);
  assert.equal(check.health.jobs.inQueue,0);assert.equal(check.health.jobs.inProgress,0);
  assert.deepEqual(check.temporaryDatabases,[]);
 }
 const target=resolve(claims,`stage-${stage}.json`);await mkdir(dirname(target),{recursive:true});
 await writeFile(target,JSON.stringify({claimed_at:new Date().toISOString(),manifest_sha256:manifestHash,stage,receipt,automatic_retry:false},null,2)+'\n',{flag:'wx',mode:0o600});
}
