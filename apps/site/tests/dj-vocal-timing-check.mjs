// Cross-check the worker's relocated cues against the browser's independent measured grids.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {analyzeTrack} from '../lib/ai-dj-analysis.ts';
import {vocalPerformanceReady} from '../lib/dj-vocal.ts';
const folder='../../docs/evidence/dj-guided-set-20261025',probe=JSON.parse(await readFile(folder+'/relocated-vocal-checks.json','utf8')),rows=[];
for(const row of probe.tracks){
 const path=`../../renders/dj-guided-set-20261025/bass-${row.sequence}.wav`;assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'),row.source_sha256);
 const bytes=execFileSync('ffmpeg',['-nostdin','-v','error','-i',path,'-ac','1','-ar','8000','-f','f32le','pipe:1'],{maxBuffer:3e6});
 const samples=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),analysis=analyzeTrack(samples,8000,row.source_sha256);
 const ready=vocalPerformanceReady(row.cue,analysis.grid,row.cue.start-.1);rows.push({sequence:row.sequence,cue:row.cue,grid:analysis.grid,ready});assert.ok(ready,'Browser must independently support cue '+row.sequence);
}
await writeFile(folder+'/browser-vocal-timing.json',JSON.stringify({status:'PASS measured timing',rows,voiceAudio:'Synthetic probe only; no new vocal model output',humanListening:'NOT RUN'},null,2)+'\n');
console.log('PASS: all three relocated worker cues independently pass browser timing checks.');
