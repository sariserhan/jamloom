// Fixed, previously unused vocal subset; evaluate the actual course gate without tuning.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,basename} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {detectPitch,isSingingPitch} from '../apps/web/singing-pitch.js';

const root=resolve(import.meta.dirname,'..'),base=resolve(process.argv[2]??'build-singing-holdout-20261027');
const out=process.argv[3];assert(out,'Provide a new report filename');
const manifestBytes=readFileSync(root+'/docs/evidence/singing-holdout-20261027/selection.json');
const manifest=JSON.parse(manifestBytes),receipt=JSON.parse(readFileSync(base+'/receipt.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(sha(manifestBytes),receipt.manifestSha256);
assert.equal(sha(readFileSync(root+'/apps/web/singing-pitch.js')),manifest.detectorSha256,'Detector changed after freezing the study');
const metrics=c=>({within50CentsIncludingMisses:c.correct/Math.max(1,c.referenceVoiced),voicedRecall:c.hit/Math.max(1,c.referenceVoiced),voicedPrecision:c.hit/Math.max(1,c.predictedVoiced),falseVoicedRate:c.falseVoiced/Math.max(1,c.frames-c.referenceVoiced),overallAccuracy:(c.correct+c.correctUnvoiced)/Math.max(1,c.frames)});
assert.equal(metrics({correct:1,referenceVoiced:2}).within50CentsIncludingMisses,.5);
assert.equal(isSingingPitch({frequency:220,confidence:.96,rms:.005}),true);
assert.equal(isSingingPitch({frequency:220,confidence:.94,rms:.005}),false);
const quantile=(xs,p)=>xs.length?[...xs].sort((a,b)=>a-b)[Math.min(xs.length-1,Math.floor(xs.length*p))]:null;
const timelineMatches=(labels,seconds)=>labels[0][0]<=.05&&Math.abs(labels.at(-1)[0]-seconds)<=.05;
assert(timelineMatches([[0,0],[9.98,0]],10));
assert(!timelineMatches([[0,0],[19.98,0]],10));
assert(!timelineMatches([[0,0],[4.98,0]],10));
const rows=[],quarantined=[];
for(const track of manifest.tracks){
 const file=kind=>{const name=basename(track[kind].name),data=readFileSync(base+'/'+name),expected=receipt.files.find(f=>f.name===name);assert.equal(sha(data),expected.sha256);return data;};
 file('audio');const labels=file('annotation').toString().trim().split(/\r?\n/).slice(1).map(line=>line.split(',').slice(0,2).map(Number));
 assert(labels.length>0&&labels.every((r,i)=>r.every(Number.isFinite)&&r[0]>=0&&r[1]>=0&&(!i||r[0]>labels[i-1][0])));
 const bytes=execFileSync('ffmpeg',['-v','error','-i',base+'/'+basename(track.audio.name),'-ac','1','-ar',String(manifest.sampleRate),'-f','f32le','pipe:1'],{maxBuffer:32*1024*1024});
 const pcm=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 if(!timelineMatches(labels,pcm.length/manifest.sampleRate)){
  quarantined.push({singer:track.singer,condition:track.condition,audio:basename(track.audio.name),seconds:pcm.length/manifest.sampleRate,annotationStart:labels[0][0],annotationEnd:labels.at(-1)[0],reason:'Annotation timeline does not cover audio duration within 50 ms; no label retiming or pitch scoring'});
  continue;
 }
 const c={frames:0,referenceVoiced:0,predictedVoiced:0,hit:0,falseVoiced:0,correct:0,correctUnvoiced:0,outOfRange:0},cpu=[],errors=[];let cursor=0;
 for(let at=0;at+manifest.windowSamples<=pcm.length;at+=manifest.hopSamples){
  const center=(at+manifest.windowSamples/2)/manifest.sampleRate;
  while(cursor+1<labels.length&&Math.abs(labels[cursor+1][0]-center)<Math.abs(labels[cursor][0]-center))cursor++;
  if(Math.abs(labels[cursor][0]-center)>manifest.annotationMaxDistanceSeconds)continue;
  const truth=labels[cursor][1],started=performance.now(),pitch=detectPitch(pcm.subarray(at,at+manifest.windowSamples),manifest.sampleRate);cpu.push(performance.now()-started);
  const voiced=isSingingPitch(pitch);c.frames++;if(truth>0)c.referenceVoiced++;if(voiced)c.predictedVoiced++;
  if(truth>0&&(truth<80||truth>1000))c.outOfRange++;
  if(truth>0&&voiced){c.hit++;const error=Math.abs(1200*Math.log2(pitch.frequency/truth));errors.push(error);if(error<=manifest.centTolerance)c.correct++;}
  else if(voiced)c.falseVoiced++;else if(!truth)c.correctUnvoiced++;
 }
 assert(c.frames>0&&c.referenceVoiced>0&&c.correct<=c.hit);
 rows.push({singer:track.singer,condition:track.condition,audio:basename(track.audio.name),seconds:pcm.length/manifest.sampleRate,counts:c,...metrics(c),medianCentsJointVoiced:quantile(errors,.5),p95CentsJointVoiced:quantile(errors,.95),p95CpuMs:quantile(cpu,.95)});
 console.log(track.singer,track.condition,metrics(c).within50CentsIncludingMisses);
}
function aggregate(xs){const counts=Object.fromEntries(Object.keys(xs[0].counts).map(k=>[k,xs.reduce((sum,r)=>sum+r.counts[k],0)]));return {counts,...metrics(counts),worstTrackWithin50Cents:Math.min(...xs.map(r=>r.within50CentsIncludingMisses)),worstP95CpuMs:Math.max(...xs.map(r=>r.p95CpuMs))};}
const report={status:quarantined.length?'PARTIAL dataset integrity; eligible measurements reported, quality not assumed':'PASS evaluation executed; quality is reported, not assumed',dataset:manifest.record,manifestSha256:sha(manifestBytes),detectorSha256:manifest.detectorSha256,node:process.version,selectedTracks:manifest.tracks.length,tracks:rows.length,singers:new Set(rows.map(r=>r.singer)).size,seconds:rows.reduce((s,r)=>s+r.seconds,0),quarantined,aggregate:aggregate(rows),conditions:Object.fromEntries(['slow_forte','fast_piano'].map(c=>[c,aggregate(rows.filter(r=>r.condition===c))])),results:rows,limitations:['Fixed detector and gate evaluated without threshold tuning on this new subset','Timeline guard added after finding two mismatched label files in the initial report; no score-based exclusion or label retiming','Professional vowel scales are not representative of every novice, lyric, device or noisy room','Corrected annotations are estimates, not independent electroglottograph ground truth','Nearest annotation at window center; missed and out-of-range reference frames retained','Offline CPU time is not physical microphone-to-display latency','No dataset audio, lyrics or trained weights enter shipping assets']};
writeFileSync(resolve(out),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report.aggregate));
