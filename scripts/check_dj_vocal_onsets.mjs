// Run from apps/site: node --import tsx ../../scripts/check_dj_vocal_onsets.mjs
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {analyzeTrack} from '../apps/site/lib/ai-dj-analysis.ts';
import {validVocalCue,vocalPerformanceReady} from '../apps/site/lib/dj-vocal.ts';
const root=new URL('../',import.meta.url),folder=new URL('docs/evidence/dj-vocal-onsets-20261027/',root);
const report=JSON.parse(await readFile(new URL('audio.json',folder),'utf8'));
const source=new URL(report.sourceFile,root);
assert.equal(createHash('sha256').update(await readFile(source)).digest('hex'),report.sourceSha256);
const bytes=execFileSync('ffmpeg',['-nostdin','-v','error','-i',fileURLToPath(source),'-ac','1','-ar','8000','-f','f32le','pipe:1'],{maxBuffer:3e6});
const samples=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
const analysis=analyzeTrack(samples,8000,report.sourceSha256);
const rows=report.rows.map(row=>{
 assert.ok(validVocalCue(row.cue));
 // Isolate contract compatibility from any disagreement between independent grid detectors.
 const [bpm,offset,regions]=report.workerGrid;
 const agreed={bpm,offset,maxError:.01,coverage:.95,entry:regions[0][0],exit:regions.at(-1)[1],hookSafe:false,regions:regions.map(([start,end])=>({start,end,beats:Math.round((end-start)*bpm/60)+1}))};
 assert.ok(vocalPerformanceReady(row.cue,agreed,row.cue.start-.1));
 assert.equal(vocalPerformanceReady({...row.cue,start:row.cue.start+.1},agreed,row.cue.start),false);
 return {name:row.name,cue:row.cue,contract:'PASS',independentGridAllowsEffects:vocalPerformanceReady(row.cue,analysis.grid,row.cue.start-.1)};
});
await writeFile(new URL('consumer.json',folder),JSON.stringify({status:'PASS cue contract',rows,independentGrid:analysis.grid,scope:'Browser analysis and cue functions executed in Node; no browser UI or human timing acceptance.'},null,2)+'\n');
console.log(JSON.stringify(rows));
