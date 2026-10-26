// Offline evaluation only: no corpus audio or labels enter training or product bundles.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {detectPitch} from '../apps/web/singing-pitch.js';

const root=resolve(import.meta.dirname,'..'),base=resolve(process.argv[2]||root+'/build-singing-benchmark'),out=root+'/docs/evidence/singing-completion-20261026';
const hash=(b,algorithm='sha256')=>createHash(algorithm).update(b).digest('hex');
assert.equal(hash(readFileSync(base+'/vocadito.zip'),'md5'),'dea40fd18f14d899643c4ba221b33a46','Dataset version mismatch');
const percentile=(a,p)=>a.length?[...a].sort((a,b)=>a-b)[Math.min(a.length-1,Math.floor(a.length*p))]:null;
function metrics(c){return {voicedRecall:c.hit/Math.max(1,c.referenceVoiced),voicedPrecision:c.hit/Math.max(1,c.predictedVoiced),falseVoicedRate:c.falseVoiced/Math.max(1,c.frames-c.referenceVoiced),within50CentsOfReference:c.correct/Math.max(1,c.referenceVoiced),overallAccuracy:(c.correct+c.correctUnvoiced)/c.frames};}
assert.deepEqual(metrics({hit:1,referenceVoiced:2,predictedVoiced:1,falseVoiced:0,frames:4,correct:1,correctUnvoiced:2}),{voicedRecall:.5,voicedPrecision:1,falseVoicedRate:0,within50CentsOfReference:.5,overallAccuracy:.75});
const metadata=readFileSync(base+'/vocadito/vocadito_metadata.csv','utf8').trim().split(/\r?\n/).slice(1).map(line=>line.split(','));
assert.equal(metadata.length,40);
const tracks=[];
for(const [id,singer,averageMidi,language] of metadata){
 const wav=base+'/vocadito/Audio/vocadito_'+id+'.wav',annotations=base+'/vocadito/Annotations/F0/vocadito_'+id+'_f0.csv';
 const reference=readFileSync(annotations,'utf8').trim().split(/\r?\n/).map(line=>line.split(',').map(Number));
 assert(reference.every((r,i)=>r.length===2&&r.every(Number.isFinite)&&r[1]>=0&&(i===0||r[0]>reference[i-1][0])));
 const bytes=execFileSync('ffmpeg',['-v','error','-i',wav,'-ac','1','-ar','44100','-f','f32le','pipe:1'],{maxBuffer:16*1024*1024}),audio=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 const results=[];
 for(const windowMs of [80,40]){
  const size=2**Math.ceil(Math.log2(44100*windowMs/1000)),c={frames:0,referenceVoiced:0,predictedVoiced:0,hit:0,falseVoiced:0,correct:0,correctUnvoiced:0,outOfRange:0},errors=[],times=[];let cursor=0;
  for(let offset=0;offset+size<=audio.length;offset+=441){
   const center=(offset+size/2)/44100;
   while(cursor+1<reference.length&&Math.abs(reference[cursor+1][0]-center)<Math.abs(reference[cursor][0]-center))cursor++;
   if(Math.abs(reference[cursor][0]-center)>.01)continue;
   const truth=reference[cursor][1],started=performance.now(),pitch=detectPitch(audio.subarray(offset,offset+size),44100);times.push(performance.now()-started);
   const voiced=!!pitch&&pitch.confidence>=.9&&pitch.rms>=.01;
   c.frames++;if(truth>0)c.referenceVoiced++;if(truth>0&&(truth<80||truth>1000))c.outOfRange++;if(voiced)c.predictedVoiced++;
   if(truth>0&&voiced){c.hit++;const error=Math.abs(1200*Math.log2(pitch.frequency/truth));errors.push(error);if(error<=50)c.correct++;}
   else if(voiced)c.falseVoiced++;else if(truth===0)c.correctUnvoiced++;
  }
  assert(c.frames>0&&c.referenceVoiced>0&&c.correct<=c.hit);
  results.push({windowMs,samples:size,counts:c,...metrics(c),medianCentsOnJointVoiced:percentile(errors,.5),p95CentsOnJointVoiced:percentile(errors,.95),p95CpuMs:percentile(times,.95)});
 }
 tracks.push({id,singer,averageMidi:Number(averageMidi),language,seconds:audio.length/44100,audioSha256:hash(readFileSync(wav)),annotationsSha256:hash(readFileSync(annotations)),results});
 console.log('Evaluated vocadito '+id);
}
const aggregate=[80,40].map(windowMs=>{const rows=tracks.map(t=>t.results.find(r=>r.windowMs===windowMs)),counts=Object.fromEntries(Object.keys(rows[0].counts).map(key=>[key,rows.reduce((sum,r)=>sum+r.counts[key],0)]));return {windowMs,counts,...metrics(counts),trackMedianWithin50Cents:percentile(rows.map(r=>r.within50CentsOfReference),.5),worstTrackWithin50Cents:Math.min(...rows.map(r=>r.within50CentsOfReference)),worstP95CpuMs:Math.max(...rows.map(r=>r.p95CpuMs))};});
mkdirSync(out,{recursive:true});writeFileSync(out+'/human-voice-benchmark.json',JSON.stringify({status:'PASS evaluation executed; see measured limitations',dataset:'vocadito v3 DOI 10.5281/zenodo.5578807',datasetLicense:'CC-BY-4.0',use:'Offline held-out pitch evaluation only; no training or audio redistribution',detectorSha256:hash(readFileSync(root+'/apps/web/singing-pitch.js')),node:process.version,ffmpeg:execFileSync('ffmpeg',['-version'],{encoding:'utf8'}).split('\n')[0],tracks:tracks.length,singers:new Set(tracks.map(t=>t.singer)).size,seconds:tracks.reduce((s,t)=>s+t.seconds,0),aggregate,results:tracks,limitations:['Human-corrected pYIN annotations are imperfect and related to the YIN family being tested','Nearest annotated pitch sampled at each analysis window center; 10 ms hop; no gain normalization','Errors and missed voiced frames are retained, including reference pitch outside the supported 80–1000 Hz range','Offline recordings from varied devices do not measure live microphone-to-display latency','Pitch tracking is not note-event, lyric, vocal-health or teaching-effectiveness validation']},null,2)+'\n');console.log(JSON.stringify(aggregate,null,2));
