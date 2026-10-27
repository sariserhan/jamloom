// Bounded local renders through the shipping WASM engine; no GPU or external audio.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {singingSongs,phraseFor} from '../apps/web/singing-course.js';
import {SingingScore,songScore} from '../apps/web/singing-score.js';
import {executeCommand} from '../apps/web/live-take.js';
const folder=new URL('../renders/singing-free-catalogue/',import.meta.url);mkdirSync(folder,{recursive:true});
const wasm=readFileSync(new URL('../dist/web/engine/jamloom_live.wasm',import.meta.url)),results=[];
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const id of ['paper-kites','neon-tide','frere-jacques','ode-to-joy']){
 const song=singingSongs.find(s=>s.id===id),phrase=phraseFor(song,57,song.tempo),rate=48000,frames=Math.ceil((phrase.at(-1).at+phrase.at(-1).duration+1)*rate);
 const e=new WebAssembly.Instance(await WebAssembly.compile(wasm),{}).exports;e._initialize();assert(e.jamloom_live_init(rate));
 const samples=new Float32Array(e.memory.buffer,e.jamloom_live_buffer(),4096),pcm=new Float32Array(frames*2);let frame=0,peak=0,sum=0;
 const score=new SingingScore(rate,0,songScore(song,phrase,57,rate,0,true));
 while(frame<frames)score.run(Math.min(128,frames-frame),n=>{assert(e.jamloom_live_render(n));for(let i=0;i<n*2;i++){const v=samples[i]*.3;assert(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));sum+=v*v;pcm[frame*2+i]=v;}frame+=n;},c=>assert(executeCommand(e,c)));
 assert(peak>.01&&peak<1);const file=new URL(id+'.mp3',folder);
 execFileSync('ffmpeg',['-v','error','-y','-f','f32le','-ar',String(rate),'-ac','2','-i','pipe:0','-c:a','libmp3lame','-b:a','128k',file.pathname],{input:Buffer.from(pcm.buffer)});
 const decoded=execFileSync('ffmpeg',['-v','error','-i',file.pathname,'-f','f32le','-ac','1','pipe:1'],{maxBuffer:20*1024*1024});let decodedPeak=0;for(let i=0;i<decoded.length;i+=4){const v=decoded.readFloatLE(i);assert(Number.isFinite(v));decodedPeak=Math.max(decodedPeak,Math.abs(v));}assert(decodedPeak>.01&&decodedPeak<1);
 results.push({id,status:'PASS',seconds:frames/rate,peak,rms:Math.sqrt(sum/pcm.length),decodedPeak,sha256:hash(readFileSync(file))});
}
writeFileSync(new URL('renders.json',folder),JSON.stringify({engineSha256:hash(wasm),method:'Real shipping WASM notes and instruments; MP3 decoded and checked; no human listening qualification',results},null,2)+'\n');console.log(JSON.stringify(results));
