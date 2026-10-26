import test from 'node:test';import assert from 'node:assert/strict';import {djSupervisor} from '../lib/dj-supervisor';
test('hosted DJ cleanup requires secret, explicit enablement and exact production database',async()=>{
 const secret='a'.repeat(32),env={CRON_SECRET:secret,JAMLOOM_DJ_SUPERVISOR_ENABLED:'true',JAMLOOM_WATCHDOG_TARGET:'127.0.0.1:5432/fixture'};
 let opened=0,sweeps=0,releases=0;const queries:string[]=[];let locked=true,fail=false;
 const context=()=>{opened++;return {databaseURL:'postgresql://127.0.0.1:5432/fixture',pool:{connect:async()=>({query:async(sql:string)=>{queries.push(sql);return {rows:[{locked}]};},release:()=>releases++})},sweep:async()=>{sweeps++;if(fail)throw Error('private credentials');return [{status:'shutdown_confirmed'}];}} as any;};
 const req=(token=secret,method='GET')=>new Request('https://jamloom.test/api/ai-dj/supervisor',{method,headers:{Authorization:'Bearer '+token}});
 assert.equal((await djSupervisor(req('wrong'),context,env)).status,401);
 assert.equal((await djSupervisor(req(),context,{...env,CRON_SECRET:''})).status,503);
 assert.equal((await djSupervisor(req(),context,{...env,JAMLOOM_DJ_SUPERVISOR_ENABLED:'false'})).status,503);
 assert.equal((await djSupervisor(req(),context,{...env,VERCEL:'1',VERCEL_ENV:'preview'})).status,503);
 assert.equal((await djSupervisor(req(secret,'POST'),context,env)).status,405);assert.equal(opened,0);
 assert.equal((await djSupervisor(req(),context,{...env,JAMLOOM_WATCHDOG_TARGET:'other/db'})).status,503);assert.equal(queries.length,0);
 assert.equal((await djSupervisor(req(),context,env)).status,200);assert.equal(sweeps,1);assert.equal(releases,1);
 locked=false;assert.equal((await djSupervisor(req(),context,env)).status,200);assert.equal(sweeps,1);assert.equal(releases,2);
 locked=true;fail=true;const bad=await djSupervisor(req(),context,env);assert.equal(bad.status,503);assert.doesNotMatch(await bad.text(),/credentials/);assert.equal(releases,3);assert.equal(queries.at(-1),'ROLLBACK');
 const pending=()=>({...context(),sweep:async()=>[{status:'destroy_requested'}]});assert.equal((await djSupervisor(req(),pending,env)).status,503);
});
