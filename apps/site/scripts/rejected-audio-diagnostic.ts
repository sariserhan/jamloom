import type {RunpodJob,RunpodProvider,RunpodResult} from '../lib/runpod-provider';
import type {AudioStore} from '../lib/audio-store';

type Provider=Pick<RunpodProvider,'submit'|'status'|'cancel'|'health'|'dispatchEnabled'>;
// Trial-only adapter. Copy a failed take privately before normal failed-job
// cleanup removes its staging object. Never turn a failure into a song receipt.
export function rejectedAudioDiagnostic(provider:Provider,store:Pick<AudioStore,'get'>,save:(id:string,audio:Buffer)=>Promise<void>):Provider{
 const pending=new Map<string,{id:string;key:string;bytes:number}>();
 const inspect=async(result:RunpodResult)=>{
  const job=pending.get(result.id);
  if(job&&result.status==='FAILED'&&result.failure?.startsWith('style-rejected')){
   const audio=await store.get(job.key,job.bytes);
   if(audio.length!==job.bytes)throw Error('Rejected diagnostic audio size mismatch');
   await save(job.id,audio);pending.delete(result.id);
  }
  return result;
 };
 return {
  async submit(job:RunpodJob){
   if(job.product!=='music-dna'||job.payload.duration_seconds!==100)throw Error('Diagnostic requires one 100-second Music DNA fixture');
   const key=new URL(job.output_url).pathname.split('/').slice(-2).join('/');
   if(!/^uploads\/[a-f0-9-]{36}\.wav$/.test(key))throw Error('Invalid diagnostic staging key');
   const result=await provider.submit({...job,retain_rejected_audio:true});
   pending.set(result.id,{id:job.id,key,bytes:100*192000+44});
   return inspect(result);
  },
  async status(id){return inspect(await provider.status(id));},
  cancel:id=>provider.cancel(id),health:()=>provider.health(),dispatchEnabled:()=>provider.dispatchEnabled()
 };
}
