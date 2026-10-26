export const singingNotes=[{midi:45,label:'Lower · A2'},{midi:57,label:'Middle · A3'},{midi:69,label:'Higher · A4'}];
export const frequencyFor=note=>440*2**((note-69)/12);
export class SingingHold {
 constructor(note,rate,startFrame){
  if(!singingNotes.some(n=>n.midi===note)||!Number.isFinite(rate)||rate<8000||rate>192000||!Number.isSafeInteger(startFrame)||startFrame<0)throw Error('Invalid singing exercise');
  this.target=frequencyFor(note);this.rate=rate;this.start=startFrame;this.last=null;this.held=0;this.passed=false;this.matching=false;
 }
 observe(frame,pitch){
  if(!Number.isSafeInteger(frame)||frame<this.start||this.last!==null&&frame<=this.last)return this.result(null,'Waiting for a fresh microphone frame');
  const gap=this.last===null?0:(frame-this.last)/this.rate;this.last=frame;
  const voiced=pitch&&Number.isFinite(pitch.frequency)&&pitch.frequency>=80&&pitch.frequency<=1000&&Number.isFinite(pitch.confidence)&&pitch.confidence>=.9&&pitch.confidence<=1&&Number.isFinite(pitch.rms)&&pitch.rms>=.01&&pitch.rms<=1;
  const cents=voiced?1200*Math.log2(pitch.frequency/this.target):null;
  const matching=cents!==null&&Math.abs(cents)<=50;
  if(matching&&this.matching&&gap<=.12)this.held+=gap;else this.held=0;
  this.matching=matching;
  if(this.held>=2)this.passed=true;
  return this.result(cents,this.passed?'Matched! Keep practicing whenever you like.':cents===null?'Sing or hum a steady note':cents < -50?'A little higher':cents > 50?'A little lower':'On target · keep it steady');
 }
 result(cents,message){return {passed:this.passed,held:Math.min(2,this.held),cents,message};}
}
