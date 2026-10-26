export const singingNotes=[{midi:45,label:'Lower · A2'},{midi:57,label:'Middle · A3'},{midi:69,label:'Higher · A4'}];
export const frequencyFor=note=>440*2**((note-69)/12);
export class SingingHold {
 constructor(note,rate,startFrame,seconds=2){
  if(![2,3,4].includes(seconds))throw Error('Invalid hold duration');this.seconds=seconds;
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
  if(this.held>=this.seconds)this.passed=true;
  return this.result(cents,this.passed?'Matched! Keep practicing whenever you like.':cents===null?'Sing or hum a steady note':cents < -50?'A little higher':cents > 50?'A little lower':'On target · keep it steady');
 }
 result(cents,message){return {passed:this.passed,held:Math.min(this.seconds,this.held),cents,message};}
}

export class SingingPhrase {
 constructor(phrase,rate,startFrame){
  if(!Array.isArray(phrase)||!phrase.length||phrase.length>96||!Number.isInteger(rate)||rate<8000||rate>192000||!Number.isSafeInteger(startFrame)||startFrame<0)throw Error('Invalid phrase');
  let end=0;for(const n of phrase){if(!Number.isFinite(n.at)||Math.abs(n.at-end)>1e-6||!Number.isFinite(n.duration)||n.duration<.2||n.duration>6||n.note!==null&&(!Number.isInteger(n.note)||n.note<45||n.note>81))throw Error('Invalid phrase note');end+=n.duration;}
  this.phrase=phrase;this.rate=rate;this.start=startFrame;this.duration=end;this.last=null;this.previous=-1;this.good=false;this.time=0;this.rows=phrase.map(()=>({matched:0,first:null}));
 }
 observe(frame,pitch){
  if(!Number.isSafeInteger(frame)||frame<this.start||this.last!==null&&frame<=this.last)return this.result();
  const gap=this.last===null?0:(frame-this.last)/this.rate;this.last=frame;this.time=(frame-this.start)/this.rate;
  const index=this.phrase.findIndex(n=>this.time>=n.at&&this.time<n.at+n.duration);if(index<0)return this.result();
  const n=this.phrase[index],voiced=pitch&&Number.isFinite(pitch.frequency)&&pitch.frequency>=80&&pitch.frequency<=1000&&pitch.confidence>=.9&&pitch.confidence<=1&&pitch.rms>=.01&&pitch.rms<=1;
  const cents=voiced&&n.note!==null?1200*Math.log2(pitch.frequency/frequencyFor(n.note)):null;
  const good=n.note===null?!voiced:cents!==null&&Math.abs(cents)<=50;
  if(good&&this.rows[index].first===null)this.rows[index].first=this.time-n.at;
  if(good&&this.good&&index===this.previous&&gap<=.12)this.rows[index].matched+=gap;
  this.good=good;this.previous=index;this.cents=cents;
  this.message=n.note===null?(voiced?'Leave this beat quiet':'Rest · get ready'):!voiced?'Sing the highlighted note':cents< -50?'A little higher':cents>50?'A little lower':'On target';return this.result();
 }
 result(){
  const details=this.phrase.map((n,i)=>{const row=this.rows[i],coverage=Math.min(1,row.matched/n.duration),onTime=n.note===null||row.first!==null&&row.first<=.35;return {note:n.note,coverage,onTime,passed:coverage>=.55&&onTime};});
  const done=this.time>=this.duration,passed=done&&details.every(n=>n.passed),score=Math.round(100*details.reduce((sum,n)=>sum+n.coverage*(n.onTime?1:.5),0)/details.length);
  return {done,passed,score,details,cents:this.cents??null,index:this.previous,message:this.message||'Follow the notes',held:details.filter(n=>n.passed).length};
 }
}
