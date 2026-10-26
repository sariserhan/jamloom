import {validReview,validAudibleBounds,validMixBounds,type TrackAnalysis} from './ai-dj-analysis';
import {validBeatGrid} from './ai-dj-beat-grid';
export type TransitionPlan={at:number;fade:number;offset:number;rate:number;technique:'phrase-bass'|'beat-bass'|'short-fade';reason:string};
export function planTransition(out:TrackAnalysis,incoming:TrackAnalysis,position:number,rate:number,now:number,early=false,fadeSeconds=4,vocals=false):TransitionPlan{
 if(typeof vocals!=='boolean'||![position,rate,now,fadeSeconds,out.duration,incoming.duration].every(Number.isFinite)||fadeSeconds<2||fadeSeconds>8||position<0||position>=out.duration||rate<.84||rate>1.16||now<0||out.duration<8||incoming.duration<8)throw Error('Invalid transition context');
 let end=validMixBounds(out.mixBounds,out.duration)?out.mixBounds!.end:validAudibleBounds(out.audible,out.duration)?out.audible!.end:out.duration;
 // Only a prepared successor can replace a late sustained collapse; leave earlier breakdowns and vocal phrases intact.
 if(!early&&!vocals&&fadeSeconds<=4&&!out.review&&out.energy){
  const sorted=[...out.energy].sort((a,b)=>a-b),body=sorted[Math.floor(sorted.length*.6)];
  const first=Math.ceil(Math.max(out.duration/2,(out.mixBounds?.start??0)+20,position+fadeSeconds*rate+1));
  for(let t=first;t+3<=end;t++)if(out.energy.slice(t,t+3).every(n=>n<body*.45)){end=t;break;}
 }
 const remaining=(Math.max(position+Math.min(.01,out.duration-position),end)-position)/rate,a=out.review,b=incoming.review;
 const incomingStart=validMixBounds(incoming.mixBounds,incoming.duration)?incoming.mixBounds!.start:validAudibleBounds(incoming.audible,incoming.duration)?incoming.audible!.start:0;
 if(!early&&a&&b&&validReview(a,out.duration)&&validReview(b,incoming.duration)&&a.instrumentalEdges&&b.instrumentalEdges){
  const speed=a.bpm*rate/b.bpm,fade=32*60/(a.bpm*rate),at=now+(a.mixOut-position)/rate;
  if(speed>=.96&&speed<=1.04&&at>=now+1&&b.mixIn+fade*speed<incoming.duration&&at+fade<=now+remaining+.02)
   return {at,fade,offset:b.mixIn,rate:speed,technique:'phrase-bass',reason:'Reviewed 8-bar instrumental phrases · tempo match and bass exchange'+(Math.abs(speed-1)>.0001?' · pitch follows tempo':'')};
 }
 const entryLimit=validMixBounds(incoming.mixBounds,incoming.duration)?Math.min(32,incoming.duration-16):Math.min(16,incoming.duration/3);
 const ga=out.grid,gb=incoming.grid;
 if(!early&&fadeSeconds<=4&&ga&&gb&&validBeatGrid(ga)&&validBeatGrid(gb)&&ga.exit>=Math.min(Math.max(out.duration*.6,out.duration-20),end-2)&&gb.entry<=entryLimit){
  const speed=ga.bpm*rate/gb.bpm,period=60/ga.bpm,inPeriod=60/gb.bpm;
  const exit=ga.offset+Math.floor((Math.min(ga.exit,end)-ga.offset)/period+1e-7)*period;
  const offset=gb.offset+Math.ceil((Math.max(gb.entry,incomingStart)-gb.offset)/inPeriod-1e-7)*inPeriod;
  const incomingEnd=validMixBounds(incoming.mixBounds,incoming.duration)?incoming.mixBounds!.end:incoming.duration;
  const covers=(g:typeof ga,from:number,to:number)=>g.regions?g.regions.some(r=>from>=r.start-.001&&to<=r.end+.001):from>=g.entry-.001&&to<=g.exit+.001;
  for(const beats of vocals?[8]:[32,16,4]){
   const fade=beats*period/rate,start=exit-beats*period,at=now+(start-position)/rate;
   // Leave preparation time after an extended overlap; short bodies retain the conservative handoff.
   if(beats>8&&(incomingEnd-offset-fade*speed)/speed<30)continue;
   if(speed>=(vocals?.995:.98)&&speed<=(vocals?1.005:1.02)&&at>=now+1&&at+fade<=now+remaining+.02&&offset<=entryLimit&&offset+fade*speed<incoming.duration&&covers(ga,start,exit)&&covers(gb,offset,offset+beats*inPeriod))
    return {at,fade,offset,rate:speed,technique:vocals?'short-fade':'beat-bass',reason:vocals?'Measured beats aligned across vocal edges · no bass exchange; phrases unreviewed':beats>4?'Measured steady instrumental overlap · gradual blend and bass handoff; phrases unreviewed':'Measured steady beats within sustained energy · short bass handoff; phrase boundaries unreviewed'};
  }
 }
 const fade=Math.min(fadeSeconds,remaining/2),lead=Math.min(.02,remaining/4),at=early?now+Math.min(.1,remaining/4):now+remaining-fade-Math.min(.05,remaining/4);
 const start=incomingStart;
 const entry=gb&&validBeatGrid(gb)&&gb.entry<=entryLimit&&incoming.duration-gb.entry>=8?gb.entry:0,offset=Math.max(start,entry);
 return {at:Math.max(now+lead,at),fade,offset,rate:1,technique:'short-fade',reason:early?'Requested skip · short handoff':vocals?'Unreviewed vocal edges · conservative fade; no bass exchange':entry?'Short handoff into measured steady entry · no tempo change or FX':start?'Short handoff past quiet opening · no tempo change or FX':'Timing or mix sections unverified/incompatible · short handoff, no FX'};
}
