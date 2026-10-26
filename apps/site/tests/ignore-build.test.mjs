import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
const script=new URL('../scripts/ignore-build.mjs',import.meta.url).pathname;
test('build guard compares the full deployed range and builds on uncertain history',()=>{
 const root=mkdtempSync(join(tmpdir(),'jamloom-build-'));
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 const commit=(path,text)=>{mkdirSync(join(root,path,'..'),{recursive:true});writeFileSync(join(root,path),text);git('add','.');git('-c','user.name=Test','-c','user.email=test@example.test','commit','-qm','fixture');return git('rev-parse','HEAD');};
 const run=(previous,current=git('rev-parse','HEAD'))=>spawnSync(process.execPath,[script],{cwd:join(root,'apps/site'),env:{...process.env,VERCEL_GIT_PREVIOUS_SHA:previous,VERCEL_GIT_COMMIT_SHA:current}}).status;
 try{
  git('init','-q');const base=commit('apps/site/app/page.tsx','first');
  commit('docs/test.md','docs');assert.equal(run(base),0);
  commit('apps/ios/Jamloom/test.swift','native');assert.equal(run(base),0);
  const web=commit('apps/web/mixer.js','audio');assert.equal(run(base),1);
  commit('docs/test.md','later docs');assert.equal(run(base),1,'unshipped website commit must still build');assert.equal(run(web),0);
  assert.equal(run(''),1);assert.equal(run('a'.repeat(40)),1);assert.equal(run(git('rev-parse','HEAD')),1,'explicit same-commit rebuild is allowed');assert.equal(run(base,web),1,'checkout must match deployment');
  commit('assets/manifests/test.json','{}');assert.equal(run(web),1);
  git('mv','apps/web/mixer.js','docs/mixer.js');git('-c','user.name=Test','-c','user.email=test@example.test','commit','-qm','move');assert.equal(run(web),1,'renamed source must build');
 }finally{rmSync(root,{recursive:true,force:true});}
});
