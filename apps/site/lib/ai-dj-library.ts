import {readAnalysis,saveAnalysis,validAnalysis,type TrackAnalysis} from './ai-dj-analysis';
import type {DJTrack} from './ai-dj-director';
export async function audioDuration(blob:Blob,signal?:AbortSignal){
 const url=URL.createObjectURL(blob),audio=new Audio();audio.preload='metadata';
 try{return await new Promise<number>((resolve,reject)=>{
  const done=()=>{clearTimeout(timer);signal?.removeEventListener('abort',fail);};
  const fail=()=>{done();reject(Error('Unreadable, cancelled or unsupported audio'));};const timer=setTimeout(fail,10000);
  audio.onloadedmetadata=()=>{done();audio.duration>=8&&audio.duration<=300?resolve(audio.duration):reject(Error('Choose tracks between 8 seconds and 5 minutes.'));};audio.onerror=fail;
  if(signal?.aborted){fail();return;}signal?.addEventListener('abort',fail,{once:true});audio.src=url;
 });}finally{audio.removeAttribute('src');audio.load();URL.revokeObjectURL(url);}
}
export async function analyseBuffer(buffer:AudioBuffer,hash:string,signal?:AbortSignal):Promise<TrackAnalysis>{
 const cached=readAnalysis(hash);if(cached?.gridVersion===3&&cached.mixVersion===2&&cached.audible&&Math.abs(cached.duration-buffer.duration)<.1)return cached;
 const samples=new Float32Array(Math.floor(buffer.duration*8000)),channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
 let peak=0,power=0,loudest=channels[0],best=-1;
 for(const c of channels){let energy=0;for(const v of c){if(!Number.isFinite(v)||Math.abs(v)>8)throw Error('Invalid PCM');energy+=v*v;peak=Math.max(peak,Math.abs(v));}power+=energy;if(energy>best){best=energy;loudest=c;}}
 const rms=Math.sqrt(power/(buffer.length*channels.length));
 // Choose the louder channel so out-of-phase stereo does not cancel into false silence.
 for(let i=0;i<samples.length;i++){const start=Math.floor(i*buffer.sampleRate/8000),end=Math.min(buffer.length,Math.floor((i+1)*buffer.sampleRate/8000));let sum=0;for(let j=start;j<end;j++)sum+=loudest[j];samples[i]=sum/Math.max(1,end-start);}
 const worker=new Worker(new URL('./ai-dj-analysis.worker.ts',import.meta.url));
 return new Promise((resolve,reject)=>{const stop=()=>{worker.terminate();clearTimeout(timer);signal?.removeEventListener('abort',abort);};const abort=()=>{stop();reject(Error('Cancelled'));};const timer=setTimeout(()=>{stop();reject(Error('Analysis timed out'));},20000);worker.onerror=()=>{stop();reject(Error('Analysis failed'));};worker.onmessage=({data})=>{stop();if(data.error||!validAnalysis(data.analysis,hash)){reject(Error(data.error??'Invalid analysis'));return;}const analysis={...data.analysis,...(cached?.review?{review:cached.review}:{}),rms,peak};if(!validAnalysis(analysis,hash)){reject(Error('Invalid level analysis'));return;}saveAnalysis(analysis);resolve(analysis);};if(signal?.aborted){abort();return;}signal?.addEventListener('abort',abort,{once:true});worker.postMessage({samples,hash},[samples.buffer]);});
}
export async function importTrack(file:File,context:AudioContext,signal:AbortSignal):Promise<DJTrack>{
 if(file.size>32*1024*1024||file.size===0||!/^audio\//.test(file.type)&&!/[.](mp3|wav|m4a|aac|flac|ogg)$/i.test(file.name))throw Error('Choose an audio file under 32 MB.');
 await audioDuration(file,signal);if(signal.aborted)throw Error('Cancelled');
 const bytes=await file.arrayBuffer(),sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
 if(sha256==='12cad3d3b5d66383d69207630d09d66d5203d963ab48d0f0ade7d1ee32672188')throw Error('This reference is excluded from AI DJ.');
 const buffer=await context.decodeAudioData(bytes);if(signal.aborted)throw Error('Cancelled');if(buffer.numberOfChannels>2||buffer.duration>300)throw Error('Use mono/stereo tracks up to five minutes.');
 const analysis=await analyseBuffer(buffer,sha256,signal);if(signal.aborted)throw Error('Cancelled');
 return {id:sha256,title:file.name.slice(0,120),artist:'Local file',url:URL.createObjectURL(file),sha256,energy:3,mood:'deep',vocal:false,credit:'',analysis,local:true};
}
