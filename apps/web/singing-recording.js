import {SingingPhrase} from './singing-lesson.js';

// One bounded grader per phrase; media playback position is the authoritative song clock.
export class RecordedSingingScore {
 constructor(sections,rate){
  if(!Array.isArray(sections)||!sections.length||sections.length>64)throw Error('Invalid recorded song');
  let end=0;
  this.sections=sections.map(section=>{
   if(!section||!Number.isFinite(section.at)||section.at<end||section.at>600)throw Error('Invalid recorded section');
   const phrase=new SingingPhrase(section.notes,rate,0);end=section.at+phrase.duration;
   if(end>600)throw Error('Recorded song exceeds ten minutes');
   return {at:section.at,notes:section.notes.map(n=>({...n})),duration:phrase.duration};
  });
  this.rate=rate;this.duration=end;this.results=new Map();this.reset();
 }
 reset(){this.index=-1;this.grader=null;this.lastPosition=null;this.lastFrame=null;this.results.clear();this.completeEligible=true;}
 interrupt(){this.grader=null;this.lastPosition=null;this.lastFrame=null;this.completeEligible=false;}
 observe(position,frame,pitch){
  if(!Number.isFinite(position)||position<0||position>this.duration+.25||!Number.isSafeInteger(frame)||frame<0)return null;
  if(this.lastFrame!==null&&frame<=this.lastFrame)return null;
  const discontinuity=this.lastPosition!==null&&Math.abs((position-this.lastPosition)-(frame-this.lastFrame)/this.rate)>.12;
  if(discontinuity)this.interrupt();
  const index=this.sections.findIndex(s=>position>=s.at&&position<s.at+s.duration);
  if(index!==this.index&&this.grader){this.results.set(this.index,this.grader.observe(Math.round(this.sections[this.index].duration*this.rate)+1,null));this.grader=null;}
  this.index=index;this.lastFrame=frame;this.lastPosition=position;
  if(index<0)return null;
  const section=this.sections[index];
  if(!this.grader){this.grader=new SingingPhrase(section.notes,this.rate,0);if(position-section.at>.12)this.completeEligible=false;}
  return this.grader.observe(Math.round((position-section.at)*this.rate),pitch);
 }
 finish(){
  if(this.grader)this.results.set(this.index,this.grader.observe(Math.round(this.sections[this.index].duration*this.rate)+1,null));
  return {passed:this.completeEligible&&this.results.size===this.sections.length&&[...this.results.values()].every(r=>r.passed),sections:this.results.size,results:[...this.results.entries()]};
 }
}

// Align a completed capture window with the media clock; discard stale, paused or seeking input.
export function recordedCapturePosition(media,context,frame,windowSamples){
 if(media.paused||media.seeking||media.ended||media.readyState<3||media.playbackRate!==1||context.state!=='running'||!Number.isSafeInteger(frame)||frame<0||!Number.isInteger(windowSamples)||windowSamples<512||windowSamples>8192)return null;
 const lag=context.currentTime-(frame-windowSamples/2)/context.sampleRate;
 if(!Number.isFinite(lag)||lag<0||lag>.25)return null;
 const position=media.currentTime-lag;
 return Number.isFinite(position)&&position>=0?position:null;
}
