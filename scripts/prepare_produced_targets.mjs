// Local review candidates only. A separator and pitch detector cannot establish ground truth.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {detectPitch,isSingingPitch} from '../apps/web/singing-pitch.js';
const root=fileURLToPath(new URL('../',import.meta.url)),out=root+'renders/club-studies-20261024/sung-targets/review/';
await mkdir(root+'renders/club-studies-20261024/sung-targets',{recursive:true});
await mkdir(out,{recursive:false});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),report=[];
for(const [id,slug] of [['deep-house-male','long-way-home'],['eurodance-female','leave-it-all-outside']]){
 const source=root+`renders/spleeter-local-20261027/${id}/vocals.npy`;
 const words=JSON.parse(await readFile(root+`docs/evidence/spleeter-local-20261027/targets/${id}-words.json`,'utf8'));
 assert.equal(hash(await readFile(source)),words.source_sha256);
 const pcm=execFileSync(root+'.venv-singer/bin/python',['-c','import numpy as np,sys; a=np.load(sys.argv[1],allow_pickle=False); assert a.shape==(5760000,2) and np.isfinite(a).all(); sys.stdout.buffer.write(a.mean(axis=1).astype("<f4").tobytes())',source],{maxBuffer:24*1024*1024});
 const samples=new Float32Array(pcm.buffer.slice(pcm.byteOffset,pcm.byteOffset+pcm.byteLength)),trace=[];
 for(let i=0;i+4096<=samples.length;i+=960){
  const pitch=detectPitch(samples.subarray(i,i+4096),48000);
  trace.push([+( (i+2048)/48000 ).toFixed(4),isSingingPitch(pitch)?+(69+12*Math.log2(pitch.frequency/440)).toFixed(3):null]);
 }
 assert.ok(trace.length>5900&&trace.some(p=>p[1]!==null));
 for(const s of words.segments)assert.ok(Number.isFinite(s.at)&&Number.isFinite(s.end)&&s.at>=0&&s.end>s.at&&s.end<=120&&typeof s.text==='string');
 const lyrics=JSON.parse(await readFile(root+`assets/singing-recordings/${slug}-lyrics.json`,'utf8'));
 const data={title:lyrics.title,verified:false,scoringEnabled:false,source_sha256:words.source_sha256,detector_sha256:hash(await readFile(root+'apps/web/singing-pitch.js')),trace,segments:words.segments,authored:lyrics.text};
 await writeFile(out+id+'.json',JSON.stringify(data),{flag:'wx'});
 await copyFile(root+`renders/club-studies-20261024/separator/review/${id}-song.mp3`,out+id+'.mp3');
 report.push({id,source_sha256:data.source_sha256,frames:trace.length,pitched:trace.filter(p=>p[1]!==null).length,verified:false,scoringEnabled:false,target_sha256:hash(await readFile(out+id+'.json'))});
}
await copyFile(root+'scripts/fixtures/produced-targets.html',out+'index.html');
await writeFile(root+'docs/evidence/spleeter-local-20261027/target-review.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log('PASS: source-bound pitch/transcript candidates; no verified notes or grades');
