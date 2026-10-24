import {validReview,type TrackAnalysis} from './ai-dj-analysis';
export type TransitionPlan={at:number;fade:number;offset:number;rate:number;technique:'phrase-bass'|'short-fade';reason:string};
export function planTransition(out:TrackAnalysis,incoming:TrackAnalysis,position:number,rate:number,now:number,early=false):TransitionPlan{
 if(![position,rate,now,out.duration,incoming.duration].every(Number.isFinite)||position<0||position>=out.duration||rate<.84||rate>1.16||now<0||out.duration<8||incoming.duration<8)throw Error('Invalid transition context');
 const remaining=(out.duration-position)/rate,a=out.review,b=incoming.review;
 if(!early&&a&&b&&validReview(a,out.duration)&&validReview(b,incoming.duration)&&a.instrumentalEdges&&b.instrumentalEdges){
  const speed=a.bpm*rate/b.bpm,fade=32*60/(a.bpm*rate),at=now+(a.mixOut-position)/rate;
  if(speed>=.96&&speed<=1.04&&at>=now+1&&b.mixIn+fade*speed<incoming.duration&&at+fade<=now+remaining+.02)
   return {at,fade,offset:b.mixIn,rate:speed,technique:'phrase-bass',reason:'Reviewed 8-bar instrumental phrases · tempo match and bass exchange'+(Math.abs(speed-1)>.0001?' · pitch follows tempo':'')};
 }
 const fade=Math.min(2,remaining/2),lead=Math.min(.02,remaining/4),at=early?now+Math.min(.1,remaining/4):now+remaining-fade-Math.min(.05,remaining/4);
 return {at:Math.max(now+lead,at),fade,offset:0,rate:1,technique:'short-fade',reason:early?'Requested skip · short handoff':'Timing or mix sections unverified/incompatible · short handoff, no FX'};
}
