// Runs the real standalone dispatcher, killing it once after a completed response.
import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {once} from 'node:events';import {createInterface} from 'node:readline';import {readFile,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
export async function qualificationProcess({env,folder,pool,signal,onTrack}){
 let child,crashed=false,proof,deadline,stderr='';
 const stop=()=>child?.kill('SIGTERM');signal.addEventListener('abort',stop,{once:true});
 try{for(let attempt=0;attempt<2;attempt++){
  if(signal.aborted)return;
  child=spawn(process.execPath,['--import','tsx',...(attempt===0?['--import','./tests/dj-crash-after-response.mjs']:[]),'scripts/dj-warm-worker.ts'],{env,stdio:['ignore','pipe','pipe']});const exited=once(child,'exit');child.stderr.on('data',s=>stderr+=s);
  for await(const line of createInterface({input:child.stdout})){if(!line.trim())continue;const value=JSON.parse(line);if(value.session){
   if(crashed&&!proof){const lost=JSON.parse(await readFile(env.JAMLOOM_DJ_CRASH_RECEIPT,'utf8'));assert.deepEqual(value.receipt,lost);const row=(await pool.query('SELECT deadline FROM dj_session_batches WHERE lease=$1',[lost.job])).rows[0];assert.equal(new Date(row.deadline).getTime(),deadline);proof={status:'PASS',processKilled:'SIGKILL after completed renderer response',sameJob:true,sameReceipt:true,sameEngine:true,deadlineUnchanged:true};await writeFile(resolve(folder,'process-recovery.json'),JSON.stringify(proof,null,2));}
   await onTrack(value);
  }}
  const [code,killed]=await exited;
  if(attempt===0&&!signal.aborted){assert.equal(killed,'SIGKILL',stderr);const lost=JSON.parse(await readFile(env.JAMLOOM_DJ_CRASH_RECEIPT,'utf8'));const row=(await pool.query('SELECT deadline,state,lease_until FROM dj_session_batches WHERE lease=$1',[lost.job])).rows[0];assert.equal(row.state,'running');assert.ok(new Date(row.lease_until).getTime()>Date.now());deadline=new Date(row.deadline).getTime();crashed=true;continue;}
  assert.equal(code,0,stderr);assert.ok(proof,'Dispatcher recovery must complete');return proof;
 }}finally{signal.removeEventListener('abort',stop);if(child&&child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill('SIGTERM');await exited;}await writeFile(resolve(folder,'dispatcher.log'),stderr);}
}
