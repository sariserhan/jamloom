// Reproduce the old RMS gate and guarded quiet-input change on the same retained corpus.
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {detectPitch as candidate,isSingingPitch} from '../apps/web/singing-pitch.js';
const root=new URL('../',import.meta.url).pathname;
assert.equal(createHash('md5').update(readFileSync(root+'build-singing-benchmark/vocadito.zip')).digest('hex'),'dea40fd18f14d899643c4ba221b33a46');
const originals=new Map(JSON.parse(readFileSync(root+'docs/evidence/singing-completion-20261026/human-voice-benchmark.json')).results.map(r=>[String(r.id),r]));
const sha=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const rows=[];
for(let id=1;id<=40;id++){
 const path=root+'/build-singing-benchmark/vocadito/',ref=readFileSync(path+'Annotations/F0/vocadito_'+id+'_f0.csv','utf8').trim().split(/\r?\n/).map(r=>r.split(',').map(Number));
 assert.equal(sha(path+'Audio/vocadito_'+id+'.wav'),originals.get(String(id)).audioSha256);assert.equal(sha(path+'Annotations/F0/vocadito_'+id+'_f0.csv'),originals.get(String(id)).annotationsSha256);
 const bytes=execFileSync('ffmpeg',['-v','error','-i',path+'Audio/vocadito_'+id+'.wav','-ac','1','-ar','44100','-f','f32le','pipe:1'],{maxBuffer:16000000}),a=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 const counts=[.01,.003,.003].map((rms,index)=>({rms,guard:index===2,frames:0,truth:0,predicted:0,hit:0,correct:0,false:0,quietMiss:0,confidenceMiss:0,octave:0}));let cursor=0;
 for(let off=0;off+2048<=a.length;off+=441){const t=(off+1024)/44100;while(cursor+1<ref.length&&Math.abs(ref[cursor+1][0]-t)<Math.abs(ref[cursor][0]-t))cursor++;if(Math.abs(ref[cursor][0]-t)>.01)continue;
 const truth=ref[cursor][1],p=candidate(a.subarray(off,off+2048),44100);for(const c of counts){const voiced=c.guard?isSingingPitch(p):p&&p.confidence>=.9&&p.rms>=c.rms;c.frames++;if(truth)c.truth++;if(voiced)c.predicted++;if(voiced&&truth){c.hit++;const err=Math.abs(1200*Math.log2(p.frequency/truth));if(err<=50)c.correct++;if(Math.abs(err-1200)<50)c.octave++;}else if(voiced)c.false++;else if(truth){if(p&&p.rms<c.rms)c.quietMiss++;else c.confidenceMiss++;}}
 } rows.push({id,counts});
}
const total=rows[0].counts.map((_,i)=>Object.fromEntries(Object.keys(rows[0].counts[i]).map(k=>[k,['rms','guard'].includes(k)?rows[0].counts[i][k]:rows.reduce((s,r)=>s+r.counts[i][k],0)])));
writeFileSync(root+'docs/evidence/local-audio-followthrough-20261026/quiet-pitch-comparison.json',JSON.stringify({dataset:'vocadito v3; 40 recordings, 29 singers; evaluation only',detectorSha256:createHash('sha256').update(readFileSync(root+'apps/web/singing-pitch.js')).digest('hex'),windowSamples:2048,rate:44100,hop:441,limitations:['Previously inspected corpus, not an independent holdout for this change','More quiet notes detected at the cost of extra false voicing','Controlled noise checks do not replace room and microphone acceptance','No model training or corpus redistribution'],rows,total},null,2)+'\n');console.log(total);
