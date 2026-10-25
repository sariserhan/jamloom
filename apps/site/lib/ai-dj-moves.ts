import type {TrackAnalysis} from './ai-dj-analysis';
import {validBeatGrid} from './ai-dj-beat-grid';
import type {PerformanceAction} from './ai-dj-performance';

// A measured beat is not a reviewed phrase: use sparse slip effects, never guessed scratches.
export function performanceMove(a:TrackAnalysis,position:number,rate:number,now:number,transitionAt:number,last:number,ordinal:number,vocal:boolean){
 const g=a.grid;if(vocal||!g||!validBeatGrid(g)||![position,rate,now,transitionAt,last].every(Number.isFinite)||!Number.isSafeInteger(ordinal)||ordinal<0||rate<.84||rate>1.16||position<8||position-last<16*60/g.bpm)return null;
 const beat=60/g.bpm,atPosition=g.offset+Math.ceil((position+.12*rate-g.offset)/beat)*beat;
 const region=g.regions?.find(r=>atPosition>=r.start+4*beat&&atPosition+8*beat<=r.end)??(!g.regions&&atPosition>=g.entry+4*beat&&atPosition+8*beat<=g.exit?{start:g.entry,end:g.exit}:undefined);
 const at=now+(atPosition-position)/rate;
 if(!region||at+8*beat/rate+6>=transitionAt||a.changes.some(t=>Math.abs(t-atPosition)<4))return null;
 const actions:PerformanceAction[]=['filter','roll-one','echo'];
 return {action:actions[ordinal%actions.length],at,position:atPosition};
}
