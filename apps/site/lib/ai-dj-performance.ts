export const performancePads=[
 {id:'cue-1',label:'Cue 1',detail:'Start'}, {id:'cue-2',label:'Cue 2',detail:'8 beats'},
 {id:'roll-half',label:'½ roll',detail:'Slip'}, {id:'roll-one',label:'1 roll',detail:'Slip'},
 {id:'loop-2',label:'2 loop',detail:'2 beats'}, {id:'loop-4',label:'4 loop',detail:'4 beats'},
 {id:'echo',label:'Echo',detail:'Beat FX'}, {id:'backspin',label:'Backspin',detail:'Slip'},
] as const;
export type PerformanceAction=typeof performancePads[number]['id']|'filter'|'jog-back'|'jog-forward';
export type PerformanceEvent={action:PerformanceAction;label:string;at:number;until:number;position:number;by:'AI'|'You'};
export const actionLabel=(action:PerformanceAction)=>performancePads.find(p=>p.id===action)?.label??({'filter':'Filter sweep','jog-back':'Jog −','jog-forward':'Jog +'} as Record<string,string>)[action];
export function loopRegion(position:number,bpm:number,beats:number,duration:number,offset=0){
 if(![position,bpm,beats,duration,offset].every(Number.isFinite)||bpm<60||bpm>180||offset<0||offset>=60/bpm||![.5,1,2,4,8].includes(beats)||duration<8)throw Error('Invalid loop');
 const length=60/bpm*beats,start=Math.max(0,Math.min(duration-length,offset+Math.floor((position-offset)/(60/bpm))*(60/bpm)));
 return {start,end:start+length};
}
type Voice={source:AudioBufferSourceNode;gain:GainNode;at:number;offset:number;rate:number;loop:{start:number;end:number}|null;end:number};
export function voicePosition(voice:Pick<Voice,'at'|'offset'|'rate'|'loop'>,now:number,duration:number){
 let position=voice.offset+Math.max(0,now-voice.at)*voice.rate;
 if(voice.loop&&position>=voice.loop.end)position=voice.loop.start+(position-voice.loop.start)%(voice.loop.end-voice.loop.start);
 return Math.max(0,Math.min(duration,position));
}

// Each gesture changes the same source/parameter timeline used by the visual readout.
export class PerformanceDeck{
 readonly gain:GainNode;
 readonly level:GainNode;
 readonly filter:BiquadFilterNode;
 private voices:Voice[]=[];
 event:PerformanceEvent|null=null;
 private filterValue=0;
 private lastPosition=0;
 constructor(private context:AudioContext,readonly buffer:AudioBuffer,readonly bpm:number,destination:AudioNode,private echo:{wet:GainNode;dry:GainNode;delays:DelayNode[]},private baseRate=1,private beatOffset=0){
  this.gain=context.createGain();this.level=context.createGain();this.filter=context.createBiquadFilter();
  this.filter.type='lowpass';this.filter.frequency.value=20000;this.filter.Q.value=.5;
  this.filter.connect(this.level);this.level.connect(this.gain);this.gain.connect(destination);
 }
 private voice(now:number){return this.voices.filter(v=>v.at<=now&&v.end>now).at(-1);}
 position(now=this.context.currentTime){const v=this.voice(now);return v?voicePosition(v,now,this.buffer.duration):this.lastPosition;}
 private retire(voice:Voice,at:number){
  voice.end=Math.min(voice.end,at+.006);voice.gain.gain.cancelAndHoldAtTime(at);voice.gain.gain.linearRampToValueAtTime(0,at+.006);voice.source.stop(at+.006);
 }
 play(at:number,offset=0,rate=this.baseRate,loop?:{start:number;end:number},reverseSeconds=0){
  for(const v of this.voices)if(v.end>at)this.retire(v,at);
  const source=this.context.createBufferSource(),gain=this.context.createGain();
  if(reverseSeconds){
   const frames=Math.max(1,Math.min(Math.floor(offset*this.buffer.sampleRate),Math.ceil(reverseSeconds*Math.abs(rate)*this.buffer.sampleRate)));
   const reversed=this.context.createBuffer(2,frames,this.buffer.sampleRate),end=Math.min(this.buffer.length-1,Math.floor(offset*this.buffer.sampleRate));
   for(let c=0;c<2;c++){const input=this.buffer.getChannelData(c),output=reversed.getChannelData(c);for(let i=0;i<frames;i++)output[i]=input[end-i];}
   source.buffer=reversed;source.loop=false;
  }else if(loop){
   const frames=Math.floor((loop.end-loop.start)*this.buffer.sampleRate),segment=this.context.createBuffer(2,frames,this.buffer.sampleRate),first=Math.floor(loop.start*this.buffer.sampleRate),fade=Math.min(128,Math.floor(frames/4));
   for(let c=0;c<2;c++){const input=this.buffer.getChannelData(c),output=segment.getChannelData(c);for(let i=0;i<frames;i++)output[i]=input[first+i]*Math.min(1,i/fade,(frames-1-i)/fade);}
   source.buffer=segment;source.loop=true;source.loopStart=0;source.loopEnd=segment.duration;
  }else{source.buffer=this.buffer;source.loop=false;}

  source.playbackRate.value=Math.abs(rate);source.connect(gain);gain.connect(this.filter);
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(1,at+.006);
  const voice:Voice={source,gain,at,offset,rate,loop:reverseSeconds?null:loop!,end:Infinity};this.voices.push(voice);
  source.onended=()=>{if(voice.end===Infinity)this.lastPosition=this.buffer.duration;source.disconnect();gain.disconnect();this.voices=this.voices.filter(v=>v!==voice);};
  source.start(at,reverseSeconds||source.buffer!==this.buffer?0:Math.max(0,Math.min(this.buffer.duration-.001,offset)));
 }
 perform(action:PerformanceAction,at:number,by:'AI'|'You'){
  if(!performancePads.some(p=>p.id===action)&&!['filter','jog-back','jog-forward'].includes(action))return false;
  if(!this.voice(at)||this.event&&this.event.until>at)return false;
  const beat=60/(this.bpm*this.baseRate),position=this.position(at);let duration=beat*4;
  if(action.startsWith('loop-')||action.startsWith('roll-')){
   const beats=action==='roll-half'?.5:action==='roll-one'?1:Number(action.slice(5));
   const loop=loopRegion(position,this.bpm,beats,this.buffer.duration,this.beatOffset);duration=beat*(action.startsWith('roll')?2:8);
   this.play(at,loop.start,this.baseRate,loop);
   const resume=action.startsWith('roll')?position+duration*this.baseRate:loop.start;
   this.play(at+duration,Math.min(this.buffer.duration-.01,resume));
  }else if(action.startsWith('cue-')){duration=beat;this.play(at,action==='cue-1'?0:480/this.bpm);}
  else if(action==='backspin'){
   if(position<1)return false;duration=Math.min(beat,position/2);this.play(at,position,-2,undefined,duration);this.play(at+duration,Math.min(this.buffer.duration-.01,position+duration*this.baseRate));
  }else if(action.startsWith('jog-')){
   duration=beat*2;const rate=this.baseRate*(action==='jog-back'?.88:1.12);this.play(at,position,rate);this.play(at+duration,Math.min(this.buffer.duration-.01,position+duration*rate));
  }else if(action==='filter'){
   this.filter.frequency.cancelScheduledValues(at);this.filter.frequency.setValueAtTime(20000,at);this.filter.frequency.exponentialRampToValueAtTime(650,at+duration/2);this.filter.frequency.exponentialRampToValueAtTime(20000,at+duration);
  }else if(action==='echo'){
   this.echo.delays.forEach((delay,i)=>delay.delayTime.setValueAtTime(beat*(i+1),at));
   for(const [param,from,to] of [[this.echo.wet.gain,0,.28],[this.echo.dry.gain,1,.72]] as const){param.cancelScheduledValues(at);param.setValueAtTime(from,at);param.linearRampToValueAtTime(to,at+.03);param.setValueAtTime(to,at+duration-beat);param.linearRampToValueAtTime(from,at+duration);}
  }
  this.event={action,label:actionLabel(action),at,until:at+duration,position,by};return true;
 }
 repeatPhrase(at:number,start:number,seconds:number){
  if(![at,start,seconds].every(Number.isFinite)||at<this.context.currentTime||start<0||seconds<=0||seconds>2||start+seconds>=this.buffer.duration||!this.voice(at)||this.event&&this.event.until>at)return false;
  const duration=2*seconds/this.baseRate;
  this.play(at,start,this.baseRate,{start,end:start+seconds});
  this.play(at+duration,start+seconds,this.baseRate);
  this.event={action:'loop-4',label:'Vocal loop · 2 repeats',at,until:at+duration,position:start,by:'AI'};return true;
 }
 cancel(){
  const now=this.context.currentTime,position=this.position(now);
  if(this.event&&this.event.until>now)this.play(now+.01,position);
  this.event=null;this.setFilter(this.filterValue);
  this.echo.wet.gain.cancelScheduledValues(now);this.echo.wet.gain.setTargetAtTime(0,now,.01);this.echo.dry.gain.cancelScheduledValues(now);this.echo.dry.gain.setTargetAtTime(1,now,.01);
 }
 setFilter(value:number){
  if(!Number.isFinite(value)||value<0||value>1)return;
  this.filterValue=value;const now=this.context.currentTime;this.filter.frequency.cancelScheduledValues(now);this.filter.frequency.setTargetAtTime(20000*Math.pow(.025,value),now,.02);
 }
 snapshot(now:number){
  const event=this.event&&now>=this.event.at&&now<this.event.until?this.event:null,voice=this.voice(now);
  return {event,rate:voice?.rate??1,loopBeats:event&&/loop|roll/.test(event.action)?(voice?.loop?(voice.loop.end-voice.loop.start)*this.bpm/60:0):0,filter:Math.max(0,Math.min(1,Math.log(this.filter.frequency.value/20000)/Math.log(.025))),level:this.level.gain.value,echo:this.echo.wet.gain.value};
 }
 dispose(){const now=this.context.currentTime;for(const v of this.voices)this.retire(v,now);this.event=null;this.gain.gain.cancelScheduledValues(now);this.gain.gain.setTargetAtTime(0,now,.002);setTimeout(()=>{this.filter.disconnect();this.level.disconnect();this.gain.disconnect();},30);}
}
