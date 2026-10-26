import {analyseBuffer,audioDuration} from './ai-dj-library';
import {planTransition,type TransitionPlan} from './ai-dj-plan';
import type {TrackAnalysis} from './ai-dj-analysis';
import {PerformanceDeck,type PerformanceAction,type PerformanceEvent} from './ai-dj-performance';
import {vocalPerformanceReady} from './dj-vocal';
import {performanceMove} from './ai-dj-moves';
import {djStyles} from './dj-styles';
import {beatTempo,validBeatDirection} from './dj-beat';
import {createMixer,clearEcho} from '../../web/mixer.js';
import {djTracks,pickTrack,type Direction,type DJTrack} from './ai-dj-director';

type Prepared={track:DJTrack;buffer:AudioBuffer;bpm:number;wave:number[];analysis:TrackAnalysis};
type Deck=Prepared&{performance?:PerformanceDeck;gain?:GainNode;start:number;offset?:number;rate?:number;vocalPlayed?:boolean;moves?:number;lastMove?:number};
type Blend=TransitionPlan&{from:number;to:number;end:number};
export type DJSnapshot={status:'idle'|'loading'|'playing'|'closing'|'paused'|'stopped'|'error';message:string;direction:Direction;master:number;analysis:TrackAnalysis|null;plan:string;mode:'auto'|'together';cross:number;elapsed:number;remaining:number|null;transitionIn:number|null;history:string[];mixing:boolean;performance:PerformanceEvent[];decks:({title:string;artist:string;vocal:boolean;reviewed:boolean;bpm:number;duration:number;position:number;playing:boolean;wave:number[];rate:number;loopBeats:number;filter:number;level:number;echo:number;eq:number[];event:PerformanceEvent|null}|null)[];peak:number};

async function prepare(track:DJTrack,context:AudioContext,signal:AbortSignal):Promise<Prepared>{
 const response=await fetch(track.url,{signal});if(!response.ok)throw Error('Track unavailable');
 if(Number(response.headers.get('content-length'))>64*1024*1024)throw Error('Track exceeds preview limit');
 const bytes=await response.arrayBuffer();if(bytes.byteLength>64*1024*1024)throw Error('Track exceeds preview limit');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 if(hash!==track.sha256)throw Error('Prepared track checksum changed');
 await audioDuration(new Blob([bytes]),signal);if(signal.aborted)throw Error('Cancelled');
 const decoded=await context.decodeAudioData(bytes);if(signal.aborted)throw Error('Cancelled');
 if(decoded.duration<8||decoded.duration>300||decoded.numberOfChannels>2||decoded.length*8>128*1024*1024)throw Error('Unsupported prepared track');
 let buffer=decoded;
 if(decoded.numberOfChannels===1){buffer=context.createBuffer(2,decoded.length,context.sampleRate);for(let c=0;c<2;c++)buffer.copyToChannel(decoded.getChannelData(0),c);}
 const analysis=await analyseBuffer(buffer,track.sha256,signal);
 return {track,buffer,analysis,bpm:analysis.review?.bpm??analysis.grid?.bpm??analysis.bpm,wave:analysis.wave};
}

// One source per generated session; null means credits/Stop ended further generation.
export type DJTrackSource=(direction:Direction,signal:AbortSignal)=>Promise<{sequence:number;track:DJTrack}|null>;
export class AIDJPlayer{
 context:AudioContext;
 mixer:ReturnType<typeof createMixer>;
 private decks:(Deck|null)[]=[null,null];
 private active=0;
 private blend:Blend|null=null;
 private state:DJSnapshot['status']='idle';
 private message='Choose local files or load the two example tracks for playback testing.';
 private direction:Direction={energy:4,mood:'deep',vocals:true};
 private master=.65;
 private mode:'auto'|'together'='together';
 private history:string[]=[];
 private unavailable=new Set<string>();
 private request=0;
 private loading=false;
 private abort:AbortController|null=null;
 private interval:ReturnType<typeof setInterval>|undefined;
 private began=0;
 private endedElapsed=0;
 private endAt:number|null=null;
 private early=false;
 private meter=new Float32Array(256);
 private disposed=false;
 private sequence=0;
 private sourceEnded=false;
 private generatedHashes:string[]=[];
 private performed:PerformanceEvent[]=[];
 private moveOrdinal=0;
 constructor(private changed:(snapshot:DJSnapshot)=>void,private tracks=djTracks,private source?:DJTrackSource){
  this.context=new AudioContext({sampleRate:32000});this.mixer=createMixer(this.context);this.mixer.meter.fftSize=256;
  this.applyMaster();this.context.onstatechange=()=>{if(this.context.state!=='running'&&this.running)this.stop('Audio was interrupted. Press Start set to resume.');};
 }
 private get running(){return this.state==='playing'||this.state==='closing';}
 snapshot():DJSnapshot{
  const now=this.context.currentTime;
  const cross=this.blend?Math.max(0,Math.min(1,(now-this.blend.at)/(this.blend.end-this.blend.at))):0;
  const active=this.decks[this.active];
  this.mixer.meter.getFloatTimeDomainData(this.meter);
  return {status:this.state,message:this.message,direction:{...this.direction},master:this.master,analysis:active?.analysis??null,plan:this.blend?.reason??(this.mode==='auto'?'Preparing a conservative transition':'Manual control'),mode:this.mode,cross:this.blend?(this.blend.to===1?cross:1-cross):this.active,elapsed:this.running||this.state==='paused'?Math.max(0,now-this.began):this.endedElapsed,remaining:this.endAt===null?null:Math.max(0,this.endAt-now),transitionIn:this.blend?Math.max(0,this.blend.at-now):null,history:[...this.history],peak:Math.max(...this.meter.map(Math.abs)),mixing:!!this.blend&&now>=this.blend.at,performance:this.performed.filter(e=>e.at<=now),decks:this.decks.map((d,i)=>{
   if(!d)return null;const position=d.performance?.position(now)??0;
   return {title:d.track.title,artist:d.track.artist,vocal:d.track.vocal,reviewed:!!d.analysis.review,bpm:d.bpm*(d.rate??1),duration:d.buffer.duration,position,playing:!!d.performance&&now>=d.start&&this.running,wave:d.wave,eq:this.mixer.strips[i].eq.map(n=>n.gain.value),...(d.performance?.snapshot(now)??{rate:1,loopBeats:0,filter:0,level:1,echo:0,event:null}),level:(d.performance?.level.gain.value??1)*(d.gain?.gain.value??0)};
  })};
 }
 private emit(){if(!this.disposed)this.changed(this.snapshot());}
 async start(beforePlay?:()=>Promise<boolean>){
  if(this.disposed||this.running||this.state==='loading'||this.state==='paused')return;
  this.stopSources();this.performed=[];this.moveOrdinal=0;this.history=[];this.sequence=0;this.sourceEnded=false;this.generatedHashes=[];this.unavailable.clear();this.endedElapsed=0;this.endAt=null;this.active=0;this.blend=null;this.early=false;
  this.state='loading';this.message='Preparing the first track…';const run=++this.request;this.emit();
  try{
   await this.context.resume();if(run!==this.request)return;
   const prepared=await this.loadCandidate();if(run!==this.request)return;if(!prepared)throw Error('No tracks remain');
   if(beforePlay&&!await beforePlay()){if(run===this.request){this.state='error';this.message='Recording could not start. Check the recording status below and try again.';this.emit();}return;}if(run!==this.request)return;
   this.decks[0]={...prepared,start:0};this.began=this.context.currentTime+.1;this.beginDeck(0,this.began,1,this.mode==='auto'?prepared.analysis.mixBounds?.start??prepared.analysis.audible?.start??0:0);
   this.history=[prepared.track.id];this.state='playing';this.message='Set started. Preparing the next groove.';this.applyMaster();
   this.interval=setInterval(()=>this.tick(),50);this.emit();void this.prepareNext();
  }catch{if(run===this.request){this.state='error';this.message='The prepared music could not load. Check your connection and try Start set again.';this.emit();}}
 }
 private async loadCandidate():Promise<Prepared|null>{
  const version=this.request;
  if(this.source){
   if(this.sourceEnded)return null;
   const controller=new AbortController();this.abort=controller;
   const timer=setTimeout(()=>controller.abort(),60000);
   try{
    const direction={...this.direction,...(this.endAt===null?{}:{energy:Math.min(this.direction.energy,2)})};
    const result=await this.source(direction,controller.signal);
    if(version!==this.request)return null;
    if(controller.signal.aborted){this.sourceEnded=true;return null;}
    if(!result){this.sourceEnded=true;return null;}
    if(result.sequence!==this.sequence||this.generatedHashes.includes(result.track.sha256))throw Error('Repeated or out-of-order generated track');
    const prepared=await prepare(result.track,this.context,controller.signal);
    if(controller.signal.aborted||version!==this.request)return null;
    this.sequence++;this.generatedHashes=[...this.generatedHashes,result.track.sha256].slice(-100);
    return prepared;
   }catch(error){if(version===this.request)this.sourceEnded=true;throw error;}
   finally{clearTimeout(timer);if(this.abort===controller)this.abort=null;}
  }
  while(!this.disposed&&version===this.request){
   const remaining=this.endAt===null?Infinity:this.endAt-this.context.currentTime;
   const direction=remaining<120?{...this.direction,energy:Math.min(this.direction.energy,2)}:this.direction;
   const track=pickTrack(this.tracks,direction,this.history,new Set([...this.unavailable,...this.history]),this.endAt!==null);
   if(!track)return null;
   const controller=new AbortController();this.abort=controller;let timedOut=false;const timer=setTimeout(()=>{timedOut=true;controller.abort();},20000);
   try{return await prepare(track,this.context,controller.signal);}
   catch{if(controller.signal.aborted&&!timedOut)return null;this.unavailable.add(track.id);this.message='One track is unavailable. Trying an instrumental alternative.';this.emit();}
   finally{clearTimeout(timer);if(this.abort===controller)this.abort=null;}
  }return null;
 }
 private async prepareNext(){
  if(!this.running||this.loading||this.blend||this.decks[1-this.active])return;
  if(this.endAt!==null&&this.endAt-this.context.currentTime<12)return;
  this.loading=true;const run=this.request;
  try{const prepared=await this.loadCandidate();if(run!==this.request||(!this.running&&!(this.source&&this.state==='paused')))return;if(!prepared){this.message=this.source?'Generation ended · finishing the prepared music.':'Library exhausted · finishing this track without repeats.';return;}
   this.decks[1-this.active]={...prepared,start:Infinity};this.message=this.mode==='auto'?'Next track ready. Planning a transition.':'Next track ready. Press Mix next to blend.';this.tick();
  }catch{if(run===this.request)this.message=this.source?'The next generated track was not ready. Finishing this track safely.':'No next track could load. This preview will stop at the end.';}
  finally{if(run===this.request){this.loading=false;this.emit();}}
 }
 private beginDeck(index:number,at:number,gainValue:number,offset=0,rate=1){
  const deck=this.decks[index]!,strip=this.mixer.strips[index];
  clearEcho(this.context,strip.fx);strip.fx.wet.gain.cancelScheduledValues(this.context.currentTime);strip.fx.wet.gain.setValueAtTime(0,this.context.currentTime);strip.fx.dry.gain.cancelScheduledValues(this.context.currentTime);strip.fx.dry.gain.setValueAtTime(1,this.context.currentTime);
  strip.eq.forEach(n=>{n.gain.cancelScheduledValues(at);n.gain.setValueAtTime(0,at);});
  deck.performance=new PerformanceDeck(this.context,deck.buffer,deck.bpm,strip.input,strip.fx,rate,deck.analysis.review?deck.analysis.review.phraseStart%(60/deck.bpm):deck.analysis.grid?.offset??deck.analysis.beatOffset);deck.gain=deck.performance.gain;
  deck.gain.gain.setValueAtTime(gainValue,at);deck.start=at;deck.offset=offset;deck.rate=rate;deck.performance.level.gain.setValueAtTime(Math.min(1,.12/deck.analysis.rms,.8/deck.analysis.peak),at);deck.performance.play(at,offset,rate);
 }
 private perform(index:number,action:PerformanceAction,at:number,by:'AI'|'You'){
  const deck=this.decks[index];if(!deck?.performance||!this.running||this.blend&&this.context.currentTime>=this.blend.at)return false;
  if(deck.performance.perform(action,at,by)){this.performed=[...this.performed,deck.performance.event!].slice(-6);this.message=`${by} · Deck ${index?'B':'A'} · ${deck.performance.event!.label}`;return true;}return false;
 }
 pad(index:number,action:PerformanceAction){
  if(this.mode!=='together'||![0,1].includes(index))return;
  this.perform(index,action,this.context.currentTime+.02,'You');this.emit();
 }
 releaseLoop(index:number){if(this.mode==='together'&&[0,1].includes(index)){this.decks[index]?.performance?.cancel();this.emit();}}
 channel(index:number,control:'high'|'mid'|'low'|'filter'|'level',value:number){
  if(this.mode!=='together'||!this.running||![0,1].includes(index)||!Number.isFinite(value))return;
  const deck=this.decks[index];if(!deck?.performance)return;
  if(control==='filter'&&value>=0&&value<=1){deck.performance.cancel();deck.performance.setFilter(value);}
  else if(control==='level'&&value>=0&&value<=1)deck.performance.level.gain.setTargetAtTime(value,this.context.currentTime,.02);
  else if(['low','mid','high'].includes(control)&&value>=-12&&value<=12)this.mixer.strips[index].eq[['low','mid','high'].indexOf(control)].gain.setTargetAtTime(value,this.context.currentTime,.02);
  this.emit();
 }
 private tick(){
  if(!this.running)return;
  const now=this.context.currentTime;
  if(this.endAt!==null&&now>=this.endAt){this.stop('Set finished. Thanks for the music.');return;}
  const current=this.decks[this.active];
  const cue=current?.track.vocalCue,position=current?.performance?.position(now)??0;
  if(this.source&&this.mode==='auto'&&this.direction.vocals&&this.endAt===null&&current&&!current.vocalPlayed&&cue&&vocalPerformanceReady(cue,current.analysis.grid,position)&&this.cancelFuture()){
   const at=now+(cue.start-position)/(current.rate??1);current.vocalPlayed=true;
   if(current.performance?.repeatPhrase(at,cue.start,cue.seconds,cue.repeat,cue.echo??false)){this.performed=[...this.performed,current.performance.event!].slice(-6);this.message='AI · '+current.performance.event!.label;}
  }
  if(current&&!this.blend&&(current.performance?.position(now)??0)>=(this.mode==='auto'?current.analysis.mixBounds?.end??current.analysis.audible?.end??current.buffer.duration:current.buffer.duration)-.001){this.stop(this.source?'Prepared music finished. The set has stopped.':'Library finished. Add more tracks to continue.');return;}
  if(this.blend&&now>=this.blend.end){
   const {from,to}=this.blend;this.release(from);this.active=to;this.history=[...this.history,this.decks[to]!.track.id].slice(-100);this.blend=null;this.early=false;
   this.message=this.endAt===null?'New groove playing. Preparing what comes next.':'Closing set · preparing the final stretch.';void this.prepareNext();
  }
  const live=this.decks[this.active],livePosition=live?.performance?.position(now)??0;
  if(this.mode==='auto'&&this.endAt===null&&live?.performance&&(!live.performance.event||live.performance.event.until<=now)&&(live.moves??0)<djStyles[live.track.style??'house'].maxMoves){
   const boundary=this.blend?.at??now+((live.analysis.mixBounds?.end??live.analysis.audible?.end??live.buffer.duration)-livePosition)/(live.rate??1);
   const move=performanceMove(live.analysis,livePosition,live.rate??1,now,boundary,live.lastMove??-1000,this.moveOrdinal,live.track.vocal,live.track.style);
   if(move&&this.perform(this.active,move.action,move.at,'AI')){live.lastMove=move.position;live.moves=(live.moves??0)+1;this.moveOrdinal++;}
  }
  if((this.mode==='auto'||this.early)&&!this.blend&&!(current?.performance?.event&&current.performance.event.until>now)&&this.decks[this.active]&&this.decks[1-this.active]){
   const deck=this.decks[this.active]!,to=1-this.active,incoming=this.decks[to]!;
   const position=deck.performance?.position(now)??0;
   if(position<deck.buffer.duration){
    const plan=planTransition(deck.analysis,incoming.analysis,position,deck.rate??1,now,this.early,djStyles[deck.track.style??'house'].fadeSeconds,deck.track.vocal||incoming.track.vocal);
    if(this.endAt===null||plan.at+plan.fade+2<this.endAt){
     deck.performance?.cancel();this.beginDeck(to,plan.at,0,plan.offset,plan.rate);
     const out=Float32Array.from({length:65},(_,i)=>Math.cos(i/64*Math.PI/2)),into=Float32Array.from({length:65},(_,i)=>Math.sin(i/64*Math.PI/2));
     deck.gain!.gain.cancelScheduledValues(now);deck.gain!.gain.setValueAtTime(1,now);deck.gain!.gain.setValueCurveAtTime(out,plan.at,plan.fade);
     incoming.gain!.gain.setValueCurveAtTime(into,plan.at,plan.fade);
     if(plan.technique!=='short-fade'){
      const low=this.mixer.strips[this.active].eq[0].gain,next=this.mixer.strips[to].eq[0].gain;
      low.setValueAtTime(0,plan.at);low.linearRampToValueAtTime(-12,plan.at+plan.fade/2);
      next.setValueAtTime(-12,plan.at);next.setValueAtTime(-12,plan.at+plan.fade/2);next.linearRampToValueAtTime(0,plan.at+plan.fade);
     }
     this.blend={...plan,from:this.active,to,end:plan.at+plan.fade};this.message=plan.reason;
    }
   }
  }
  this.emit();
 }
 private cancelFuture(){
  if(this.blend&&this.context.currentTime>=this.blend.at)return false;
  if(this.blend){this.mixer.strips.forEach(strip=>{strip.eq[0].gain.cancelScheduledValues(this.context.currentTime);strip.eq[0].gain.setValueAtTime(0,this.context.currentTime);});const current=this.decks[this.active];current?.gain?.gain.cancelScheduledValues(this.context.currentTime);current?.gain?.gain.setValueAtTime(1,this.context.currentTime);this.blend=null;}
  if(this.source){
   const incoming=this.decks[1-this.active];
   if(incoming){incoming.performance?.dispose();incoming.performance=undefined;incoming.gain=undefined;incoming.start=Infinity;}
  }else{this.abort?.abort();this.request++;this.loading=false;this.release(1-this.active);}
  return true;
 }
 setDirection(change:Partial<Direction>){
  if(change.beat!==undefined&&!validBeatDirection(change.beat))return;
  if(change.energy!==undefined&&(!Number.isFinite(change.energy)||change.energy<1||change.energy>5))return;
  if(change.mood!==undefined&&!['warm','bright','deep'].includes(change.mood))return;
  this.direction={...this.direction,...change};
  if(this.running&&this.source){this.message='Direction saved for the next generated track. Prepared music stays in the set.';}
  else if(this.running&&this.cancelFuture()){this.message='Direction updated. Preparing the next track.';void this.prepareNext();}
  else this.message=this.running?'Direction saved for after this transition.':'Direction ready for your next set.';
  this.emit();
 }
 beat(change:boolean){
  const deck=this.decks[this.active];if(!this.running||!deck)return;
  const bpm=beatTempo((deck.analysis.grid?.bpm??deck.bpm)*(deck.rate??1),deck.track.beat?.bpm);
  const patterns=['steady','syncopated','rolling'] as const,current=this.direction.beat?.groove??deck.track.beat?.groove??'steady';
  const groove=change?patterns[(patterns.indexOf(current)+1)%patterns.length]:deck.track.beat?.groove??current;
  this.direction={...this.direction,beat:{bpm,groove}};
  if(!this.source&&change)this.next();
  this.message=(change?'A different groove':'This tempo and groove')+(this.source?' requested for the next unprepared original. Already prepared music stays in the set.':change?' requested at the next safe handoff.':' selected for the next tracks.');this.emit();
 }
 next(){if(!this.running||this.blend&&this.context.currentTime>=this.blend.at)return;if(this.blend){this.cancelFuture();void this.prepareNext();}this.early=true;this.message=this.decks[1-this.active]?'Next track will enter with a short handoff.':'Preparing a track before changing the music.';this.tick();}
 finish(seconds:number|null){
  if(!this.running)return;
  if(seconds!==null&&(!Number.isFinite(seconds)||seconds<10||seconds>14400))return;
  const now=this.context.currentTime,deck=this.decks[this.active]!,rate=deck.rate??1,bar=240/(deck.bpm*rate);
  const remaining=(deck.buffer.duration-(deck.performance?.position(now)??0))/rate;
  this.endAt=seconds===null?now+remaining:deck.start+Math.ceil((now+seconds-deck.start)/bar)*bar;this.state='closing';
  if(this.cancelFuture()&&seconds!==null)void this.prepareNext();this.applyMaster();this.message='Winding down to a smooth finish.';this.emit();
 }
 continue(){if(!this.running)return;this.endAt=null;this.state='playing';this.applyMaster();if(this.cancelFuture())void this.prepareNext();this.message='The party continues. Closing plan cancelled.';this.emit();}
 private applyMaster(){
  const now=this.context.currentTime,level=this.running?this.master*.8:0,fade=this.endAt===null?1:Math.max(0,Math.min(1,(this.endAt-now)/8));
  this.mixer.channels.forEach(channel=>{const gain=channel.gain;gain.cancelScheduledValues(now);gain.setTargetAtTime(level*fade,now,.02);if(this.endAt!==null){gain.setValueAtTime(level*fade,Math.min(this.endAt,Math.max(now+.03,this.endAt-8)));gain.linearRampToValueAtTime(0,this.endAt);}});
 }
 setMaster(value:number){if(!Number.isFinite(value)||value<0||value>1)return;this.master=value;this.applyMaster();this.emit();}
 setMode(value:'auto'|'together'){
  if(!['auto','together'].includes(value))return;
  if(value==='together'){
   this.performed=this.performed.filter(e=>e.at<=this.context.currentTime);
   for(const deck of this.decks)if(deck?.performance?.event?.by==='AI')deck.performance.cancel();
  }
  if(value==='together'&&!this.source&&this.blend&&this.context.currentTime>=this.blend.at){
   const now=this.context.currentTime,progress=(now-this.blend.at)/this.blend.fade,keep=progress<.5?this.blend.from:this.blend.to,drop=1-keep;
   const old=this.decks[drop]?.performance;this.decks[drop]=null;
   old?.gain.gain.cancelAndHoldAtTime(now);old?.gain.gain.linearRampToValueAtTime(0,now+.04);if(old)setTimeout(()=>old.dispose(),60);
   const chosen=this.decks[keep]!;chosen.gain!.gain.cancelAndHoldAtTime(now);chosen.gain!.gain.linearRampToValueAtTime(1,now+.04);
   this.active=keep;if(!this.history.includes(chosen.track.id))this.history.push(chosen.track.id);this.blend=null;this.early=false;
   this.mixer.strips.forEach(strip=>{strip.eq[0].gain.cancelAndHoldAtTime(now);strip.eq[0].gain.linearRampToValueAtTime(0,now+.04);});
  }else if(value==='together'&&this.blend)this.cancelFuture();
  this.mode=value;this.message=value==='auto'?'Autopilot · beat-timed moves, smooth handoffs and space for the groove.':'You have control.';
  if(this.running){void this.prepareNext();this.tick();}this.emit();
 }
 async pause(){if(!this.running)return;this.state='paused';this.message='Paused';this.emit();await this.context.suspend();}
 async resume(){if(this.state!=='paused')return;await this.context.resume();if(this.state!=='paused')return;this.state=this.endAt===null?'playing':'closing';this.message='Playback resumed';this.applyMaster();void this.prepareNext();this.tick();this.emit();}
 private release(index:number){this.decks[index]?.performance?.dispose();this.decks[index]=null;}
 private stopSources(){this.abort?.abort();this.abort=null;this.request++;this.loading=false;clearInterval(this.interval);this.interval=undefined;this.release(0);this.release(1);this.blend=null;}
 stop(message='Set stopped. Start again whenever you’re ready.'){
  if(this.running||this.state==='paused')this.endedElapsed=Math.max(0,this.context.currentTime-this.began);this.stopSources();this.state='stopped';this.endAt=null;this.early=false;this.message=message;this.applyMaster();this.emit();
 }
 dispose(){this.stop();this.disposed=true;this.context.onstatechange=null;void this.context.close();}
}
