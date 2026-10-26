import {analyzeContext} from '../../web/session-analysis.js';
import {measureBeatGrid,validBeatGrid,type BeatGrid} from './ai-dj-beat-grid';
export type MixReview={bpm:number;phraseStart:number;mixIn:number;mixOut:number;instrumentalEdges:boolean};
export type TrackAnalysis={version:1;sha256:string;duration:number;bpm:number;confidence:number;beatOffset:number;rms:number;peak:number;wave:number[];keyEstimate:string|null;changes:number[];review?:MixReview;audible?:{start:number;end:number};mixBounds?:{start:number;end:number};mixVersion?:1|2|3;grid?:BeatGrid;gridVersion?:2|3};
export function validAudibleBounds(a:TrackAnalysis['audible'],duration:number){return !!a&&[a.start,a.end,duration].every(Number.isFinite)&&a.start>=0&&a.start<=16&&a.end<=duration&&a.end>=duration-16&&a.end-a.start>=8;}
export function validMixBounds(a:TrackAnalysis['mixBounds'],duration:number){return !!a&&[a.start,a.end,duration].every(Number.isFinite)&&a.start>=0&&a.start<=Math.min(32,duration-8)&&a.end<=duration&&a.end>=duration-16&&a.end-a.start>=8;}
export function validReview(r:MixReview,duration:number){
 return !!r&&[r.bpm,r.phraseStart,r.mixIn,r.mixOut,duration].every(Number.isFinite)&&r.bpm>=60&&r.bpm<=180&&r.phraseStart>=0&&r.phraseStart<duration&&r.mixIn>=r.phraseStart&&r.mixOut>r.mixIn&&r.mixOut+32*60/r.bpm<=duration+.01&&typeof r.instrumentalEdges==='boolean'&&[r.mixIn,r.mixOut].every(t=>Math.abs((t-r.phraseStart)*r.bpm/60/32-Math.round((t-r.phraseStart)*r.bpm/60/32))<.002);
}
export function validAnalysis(a:TrackAnalysis,hash:string){
 return !!a&&a.version===1&&(a.gridVersion===undefined||a.gridVersion===2||a.gridVersion===3)&&a.sha256===hash&&/^[a-f0-9]{64}$/.test(hash)&&[a.duration,a.bpm,a.confidence,a.beatOffset,a.rms,a.peak].every(Number.isFinite)&&a.duration>=8&&a.duration<=300&&a.bpm>=60&&a.bpm<=180&&a.confidence>=0&&a.confidence<=1&&a.beatOffset>=0&&a.beatOffset<60/a.bpm&&a.rms>0&&a.rms<=2&&a.peak>0&&a.peak<=8&&Array.isArray(a.wave)&&a.wave.length===96&&a.wave.every(n=>Number.isFinite(n)&&n>=0&&n<=1)&&Array.isArray(a.changes)&&a.changes.length<=40&&a.changes.every(n=>Number.isFinite(n)&&n>=0&&n<a.duration)&&(a.keyEstimate===null||typeof a.keyEstimate==='string'&&a.keyEstimate.length<40)&&(!a.audible||validAudibleBounds(a.audible,a.duration))&&(a.mixVersion===undefined||a.mixVersion===1||a.mixVersion===2||a.mixVersion===3)&&(!a.mixBounds||validMixBounds(a.mixBounds,a.duration))&&(!a.review||validReview(a.review,a.duration))&&(!a.grid||validBeatGrid(a.grid)&&a.grid.exit<a.duration);
}
// Estimates remain suggestions: neither autocorrelation nor energy changes establish musical phrases.
export function analyzeTrack(samples:Float32Array,rate:number,sha256:string):TrackAnalysis{
 if(rate!==8000||samples.length<8*rate||samples.length>300*rate||!/^[a-f0-9]{64}$/.test(sha256))throw Error('Track must be 8 seconds–5 minutes.');
 let square=0,peak=0;const envelope:number[]=[],wave:number[]=[],seconds=samples.length/rate;
 for(let i=0;i<samples.length;i+=40){let power=0;for(let j=i;j<Math.min(i+40,samples.length);j++){const v=samples[j];if(!Number.isFinite(v)||Math.abs(v)>8)throw Error('Invalid PCM');power+=v*v;peak=Math.max(peak,Math.abs(v));}square+=power;envelope.push(Math.sqrt(power/40));}
 const rms=Math.sqrt(square/samples.length);if(rms<.0001)throw Error('Track is silent.');
 let first=-1,last=-1;for(let i=0;i<envelope.length;i++)if(envelope[i]>=Math.max(.002,rms*.05)){if(first<0)first=i;last=i;}
 const bounds={start:Math.max(0,first/200-.05),end:Math.min(seconds,(last+1)/200+.05)};
 const audible=validAudibleBounds(bounds,seconds)?{start:bounds.start>=.25?bounds.start:0,end:seconds-bounds.end>=.25?bounds.end:seconds}:{start:0,end:seconds};
 // Require two seconds of sustained body-level energy; a single kick is not a usable entry.
 const energy:number[]=[];for(let i=0;i+50<=envelope.length;i+=50){let power=0;for(let j=i;j<i+50;j++)power+=envelope[j]**2;energy.push(Math.sqrt(power/50));}
 const typical=[...energy].sort((a,b)=>a-b)[Math.floor(energy.length*.6)],threshold=Math.max(rms*.45,typical*.65);
 let mixFirst=-1,mixLast=-1,run=0;
 for(let i=0;i<energy.length;i++){run=energy[i]>=threshold?run+1:0;if(run>=8){if(mixFirst<0)mixFirst=(i-7)/4;mixLast=(i+1)/4;}}
 const mix={start:Math.max(audible.start,mixFirst),end:Math.min(audible.end,mixLast)};
 const mixBounds=validMixBounds(mix,seconds)?mix:audible;
 const window=Math.min(samples.length,rate*30),starts=[0,Math.floor((samples.length-window)/2),samples.length-window];
 const estimates=[...new Set(starts)].map(start=>analyzeContext(samples.subarray(start,start+window),rate));
 const best=[...estimates].sort((a,b)=>b.tempo.confidence-a.tempo.confidence)[0];
 const bpm=best.tempo.bpm,agreement=estimates.filter(a=>Math.abs(a.tempo.bpm-bpm)<2).length/estimates.length;
 const confidence=Math.max(0,Math.min(1,best.tempo.confidence*agreement)),period=60/bpm;
 const onset=envelope.map((n,i)=>Math.max(0,n-(envelope[i-1]??n)));let phase=0,score=-1;
 for(let offset=0;offset<period;offset+=.005){let total=0;for(let t=offset;t<Math.min(seconds,30);t+=period)total+=onset[Math.round(t*200)]??0;if(total>score){score=total;phase=offset;}}
 for(let bin=0;bin<96;bin++){let value=0;for(let i=Math.floor(bin*samples.length/96);i<Math.floor((bin+1)*samples.length/96);i++)value=Math.max(value,Math.abs(samples[i]));wave.push(value/peak);}
 const changes:number[]=[];for(let t=4;t<seconds-4&&changes.length<40;t+=4){const mean=(start:number)=>envelope.slice(start*200,(start+4)*200).reduce((s,n)=>s+n*n,0)/800;if(Math.abs(Math.log((mean(t)+1e-8)/(mean(t-4)+1e-8)))>1.2)changes.push(t);}
 let grid=measureBeatGrid(samples,rate,bpm);
 // A long weak intro can hide a steady groove; preserve absolute timing when measuring that body.
 if(!grid&&mixBounds.start>0&&mixBounds.end-mixBounds.start>=24){
  const start=mixBounds.start,body=measureBeatGrid(samples.subarray(Math.round(start*rate),Math.round(mixBounds.end*rate)),rate,bpm);
  if(body){const period=60/body.bpm;grid={...body,offset:(body.offset+start)%period,entry:body.entry+start,exit:body.exit+start,hookSafe:false,regions:body.regions?.map(r=>({...r,start:r.start+start,end:r.end+start}))};}
 }
 const notes=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
 const key=best.keys[0];return {version:1,gridVersion:3,mixVersion:3,mixBounds,sha256,duration:seconds,audible,bpm,confidence,beatOffset:phase,rms,peak,wave,keyEstimate:key?notes[key.tonic]+' '+key.mode:null,changes,grid};
}
export const analysisKey='jamloom.ai-dj.analysis.v1';
export function readAnalysis(hash:string):TrackAnalysis|null{
 try{const rows=JSON.parse(localStorage.getItem(analysisKey)??'[]');if(!Array.isArray(rows)||rows.length>100)return null;return rows.find(a=>validAnalysis(a,hash))??null;}catch{return null;}
}
export function saveAnalysis(a:TrackAnalysis){
 if(!validAnalysis(a,a.sha256))throw Error('Invalid track analysis');
 try{const previous=JSON.parse(localStorage.getItem(analysisKey)??'[]');const rows=Array.isArray(previous)?previous.filter(r=>r&&r.sha256!==a.sha256&&validAnalysis(r,r.sha256)):[];localStorage.setItem(analysisKey,JSON.stringify([...rows,a].slice(-100)));}catch{/* Playback also works with storage disabled. */}
}
