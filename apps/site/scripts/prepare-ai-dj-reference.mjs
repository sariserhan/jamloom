import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const input=process.argv[2];if(!input)throw Error('Supply the local reference audio path.');
const folder=resolve('../../renders/ai-dj-reference');await mkdir(folder,{recursive:true});
const duration=Number(JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','json',resolve(input)],{encoding:'utf8'})).format.duration);
if(!Number.isFinite(duration)||duration<540)throw Error('This reference needs at least nine minutes.');
const bank=[];
for(const [i,start] of [30,240,450].entries()){
 const id=`blood-club-${i+1}`,file=join(folder,id+'.mp3');
 execFileSync('ffmpeg',['-v','error','-nostdin','-y','-ss',String(start),'-i',resolve(input),'-t','80','-vn','-map_metadata','-1','-ac','2','-ar','44100','-c:a','libmp3lame','-b:a','128k','-threads','1',file]);
 const bytes=await readFile(file);bank.push({id,title:`Blood club · excerpt ${i+1}`,artist:'Your local reference mix',url:'/ai-dj/reference?id='+id,sha256:createHash('sha256').update(bytes).digest('hex'),energy:i+3,mood:'deep',vocal:false,reference:true,credit:'#reference-bank',bytes:bytes.length});
}
await writeFile(join(folder,'bank.json'),JSON.stringify(bank,null,2)+'\n');console.log(JSON.stringify({clips:bank.length,totalBytes:bank.reduce((n,t)=>n+t.bytes,0),originalUnchanged:true,folder}));
