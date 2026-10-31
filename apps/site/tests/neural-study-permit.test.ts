import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {claimStudyStage} from '../scripts/neural-study-permit';

test('study stages require fresh approval, unchanged code, single use and prior independent cleanup',async()=>{
 const root=await mkdtemp(join(tmpdir(),'jamloom-study-permit-'));
 try{
  const files:Record<string,string>={};for(const file of ['a','b','c','d']){await writeFile(join(root,file),file);files[file]=createHash('sha256').update(file).digest('hex');}
  const path=join(root,'permit.json'),receipt=join(root,'receipt.json');
  const permit={status:'PREPARED',campaign:'jamloom-neural-qualification-20261030',manifest_sha256:'hash',max_usd:21,max_provider_requests:69,stages:7,max_workers:1,max_stage_seconds:2400,max_stage_usd:3,retries:0,stop_on_failure:true,owner_statement:'Approved QA fixture',file_sha256:files};
  const save=()=>writeFile(path,JSON.stringify(permit));await save();
  await assert.rejects(claimStudyStage(root,path,'hash',1,receipt),/approval/);
  permit.status='AUTHORIZED';await save();await writeFile(join(root,'a'),'changed');
  await assert.rejects(claimStudyStage(root,path,'hash',1,receipt),/harness changed/);await writeFile(join(root,'a'),'a');
  await claimStudyStage(root,path,'hash',1,receipt);
  await assert.rejects(claimStudyStage(root,path,'hash',1,receipt),/EEXIST/);
  await assert.rejects(claimStudyStage(root,path,'hash',2,receipt),/ENOENT/);
  await writeFile(receipt,JSON.stringify({studyStage:1,studyManifestSha256:'hash',qualification:'FAIL',cleanup:true,disabled:true,stopped:true}));
  await assert.rejects(claimStudyStage(root,path,'hash',2,receipt),/FAIL/);
  await writeFile(receipt,JSON.stringify({studyStage:1,studyManifestSha256:'hash',qualification:'PASS',cleanup:true,disabled:true,stopped:true}));
  await assert.rejects(claimStudyStage(root,path,'hash',2,receipt),/ENOENT/);
  const post=join(root,'build-neural-qualification-20261030/claims/stage-1-postcheck.json');
  const check={receipt,cleanup:'PASS',qualification:'PASS',workerLimits:[0,0],workers:{summary:{total:1}},health:{jobs:{inQueue:0,inProgress:0}},temporaryDatabases:[]};
  await writeFile(post,JSON.stringify(check));await assert.rejects(claimStudyStage(root,path,'hash',2,receipt));
  check.workers.summary.total=0;await writeFile(post,JSON.stringify(check));await claimStudyStage(root,path,'hash',2,join(root,'receipt2.json'));
  permit.status='STOPPED_FAILURE';await save();
  await assert.rejects(claimStudyStage(root,path,'hash',3,join(root,'receipt3.json')),/approval/);
 }finally{await rm(root,{recursive:true,force:true});}
});
