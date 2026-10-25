import {validReview,validAudibleBounds,type TrackAnalysis} from './ai-dj-analysis';
import {validBeatGrid} from './ai-dj-beat-grid';
export type TransitionPlan={at:number;fade:number;offset:number;rate:number;technique:'phrase-bass'|'beat-bass'|'short-fade';reason:string};
export function planTransition(out:TrackAnalysis,incoming:TrackAnalysis,position:number,rate:number,now:number,early=false,fadeSeconds=4):TransitionPlan{
 if(![position,rate,now,fadeSeconds,out.duration,incoming.duration].every(Number.isFinite)||fadeSeconds<2||fadeSeconds>8||position<0||position>=out.duration||rate<.84||rate>1.16||now<0||out.duration<8||incoming.duration<8)throw Error('Invalid transition context');
 const end=validAudibleBounds(out.mixBounds,out.duration)?out.mixBounds!.end:validAudibleBounds(out.audible,out.duration)?out.audible!.end:out.duration;
 const remaining=(Math.max(position+Math.min(.01,out.duration-position),end)-position)/rate,a=out.review,b=incoming.review;
 if(!early&&a&&b&&validReview(a,out.duration)&&validReview(b,incoming.duration)&&a.instrumentalEdges&&b.instrumentalEdges){
  const speed=a.bpm*rate/b.bpm,fade=32*60/(a.bpm*rate),at=now+(a.mixOut-position)/rate;
  if(speed>=.96&&speed<=1.04&&at>=now+1&&b.mixIn+fade*speed<incoming.duration&&at+fade<=now+remaining+.02)
   return {at,fade,offset:b.mixIn,rate:speed,technique:'phrase-bass',reason:'Reviewed 8-bar instrumental phrases · tempo match and bass exchange'+(Math.abs(speed-1)>.0001?' · pitch follows tempo':'')};
 }
 const ga=out.grid,gb=incoming.grid;
 if(!early&&fadeSeconds<=4&&ga&&gb&&validBeatGrid(ga)&&validBeatGrid(gb)&&ga.exit>=Math.max(out.duration*.6,out.duration-20)&&gb.entry<=Math.min(16,incoming.duration/3)){
  const speed=ga.bpm*rate/gb.bpm,period=60/ga.bpm,fade=4*period/rate;
  const end=ga.exit;
  const start=end-4*period,at=now+(start-position)/rate;
  if(speed>=.98&&speed<=1.02&&at>=now+1&&at+fade<=now+remaining+.02&&gb.entry+fade*speed<incoming.duration)
   return {at,fade,offset:gb.entry,rate:speed,technique:'beat-bass',reason:'Measured steady beats · short bass handoff; phrase boundaries unreviewed'};
 }
 const fade=Math.min(fadeSeconds,remaining/2),lead=Math.min(.02,remaining/4),at=early?now+Math.min(.1,remaining/4):now+remaining-fade-Math.min(.05,remaining/4);
 const start=validAudibleBounds(incoming.mixBounds,incoming.duration)?incoming.mixBounds!.start:validAudibleBounds(incoming.audible,incoming.duration)?incoming.audible!.start:0;
 const entry=gb&&validBeatGrid(gb)&&gb.entry<=Math.min(16,incoming.duration/3)&&incoming.duration-gb.entry>=8?gb.entry:0,offset=Math.max(start,entry);
 return {at:Math.max(now+lead,at),fade,offset,rate:1,technique:'short-fade',reason:early?'Requested skip · short handoff':entry?'Short handoff into measured steady entry · no tempo change or FX':start?'Short handoff past quiet opening · no tempo change or FX':'Timing or mix sections unverified/incompatible · short handoff, no FX'};
}
