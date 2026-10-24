import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import type {DJSessions} from './dj-sessions';
import {validateWav} from './audio-validation';
const root=fileURLToPath(new URL('../../../',import.meta.url));

// Test wallets and disposable loopback databases only; never dispatches or bills a provider.
export async function runLocalDJBatch(sessions:DJSessions,directory:string,signal?:AbortSignal){
 const db=(await sessions.pool.query('SELECT current_database() AS name,host(inet_server_addr()) AS host')).rows[0];
 if(sessions.live||!sessions.store.local||!/^jamloom_dj_pipeline_[a-f0-9]+$/.test(db.name)||!['127.0.0.1','::1'].includes(db.host))throw Error('Disposable local DJ test database required');
 const runtime=sessions.budget.maxRuntimeMs;
 if(!Number.isSafeInteger(runtime)||runtime<1||runtime>120000)throw Error('Invalid local worker deadline');
 if(signal?.aborted)return null;
 const job=await sessions.claim();if(!job)return null;
 let stopped=false,failed=false,folder:string|undefined,audio:Buffer|undefined;
 try{
  folder=await mkdtemp(join(resolve(directory),'dj-'));
  const request={version:1,session:job.session_id,sequence:job.sequence,seed:job.seed,style:job.settings.style,energy:job.settings.energy};
  await writeFile(join(folder,'request.json'),JSON.stringify(request),{mode:0o600});
  const child=spawn(join(root,'.venv-analysis/bin/python'),[join(root,'scripts/dj_track_worker.py'),'--request',join(folder,'request.json'),'--output',join(folder,'result'),'--backend','procedural-test'],{cwd:root,stdio:'ignore',env:{NODE_ENV:'test',PATH:process.env.PATH,PYTHONNOUSERSITE:'1',OPENBLAS_NUM_THREADS:'1',OMP_NUM_THREADS:'1'}});
  const abort=()=>{stopped=true;child.kill('SIGKILL');};
  const deadline=setTimeout(()=>{failed=true;child.kill('SIGKILL');},runtime);
  let checking=false;
  const poll=setInterval(async()=>{if(checking)return;checking=true;try{await sessions.expire();if((await sessions.status(job.owner_id,job.session_id)).state!=='active')abort();}catch{failed=true;child.kill('SIGKILL');}finally{checking=false;}},250);
  signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  // close, not kill(), proves this local child has actually stopped before settlement.
  try{await new Promise<void>((ok,no)=>{let processError=false;child.on('error',()=>{processError=true;});child.on('close',code=>code===0&&!processError?ok():no(Error('Local renderer stopped')));});}
  finally{clearTimeout(deadline);clearInterval(poll);signal?.removeEventListener('abort',abort);}
  if(!failed&&!stopped){
   const path=join(folder,'result/track.wav'),receiptPath=join(folder,'result/receipt.json');
   if((await stat(path)).size!==11520044||(await stat(receiptPath)).size>4096)throw Error('Invalid worker output size');
   const receipt=JSON.parse(await readFile(receiptPath,'utf8'));audio=await readFile(path);
   if(!isDeepStrictEqual(receipt.request,request)||receipt.backend!=='procedural-test'||receipt.bytes!==audio.length||receipt.seconds!==60||validateWav(audio,audio.length,receipt.sha256)!==60000)throw Error('Worker receipt mismatch');
  }
 }catch{failed=true;}
 const state=stopped?'cancelled':failed?'failed':'completed';
 await sessions.finish(job.session_id,job.sequence,job.lease,state,0,audio);
 return {session:job.session_id,sequence:job.sequence,state,folder,externalSpendMicros:0,sha256:audio?createHash('sha256').update(audio).digest('hex'):null};
}
