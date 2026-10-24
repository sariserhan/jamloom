import {createMixer} from '../../web/mixer.js';
import {djTracks,pickTrack,transitionTime,type Direction,type DJTrack} from './ai-dj-director';

type Prepared={track:DJTrack;buffer:AudioBuffer;bpm:number;wave:number[]};
type Deck=Prepared&{source?:AudioBufferSourceNode;gain?:GainNode;start:number};
type Blend={from:number;to:number;at:number;end:number};
export type DJSnapshot={status:'idle'|'loading'|'playing'|'closing'|'stopped'|'error';message:string;direction:Direction;master:number;mode:'auto'|'together';tone:number;echo:number;cross:number;elapsed:number;remaining:number|null;transitionIn:number|null;history:string[];decks:({title:string;artist:string;vocal:boolean;bpm:number;duration:number;position:number;playing:boolean;wave:number[]}|null)[];peak:number};

// shortcut: pulse estimates guide preview phrasing; use verified beat/downbeat grids before musical qualification.
export function inspectPCM(data:Float32Array,rate:number){
 const hop=Math.max(1,Math.floor(rate/200)),envelope:number[]=[],wave:number[]=[];
 let square=0,peak=0;
 for(let i=0;i<data.length;i+=hop){let total=0;for(let j=i;j<Math.min(i+hop,data.length);j++){const n=data[j];if(!Number.isFinite(n))throw Error('Audio contains invalid samples');square+=n*n;peak=Math.max(peak,Math.abs(n));total+=Math.abs(n);}envelope.push(total/hop);}
 if(!data.length||Math.sqrt(square/data.length)<.0001)throw Error('Prepared track is silent');
 const flux=envelope.map((n,i)=>Math.max(0,n-(envelope[i-1]??n)));
 let bpm=120,best=-1;
 for(let tempo=96;tempo<=138;tempo++){const lag=Math.round(60*rate/hop/tempo);let score=0;for(let i=lag;i<flux.length;i++)score+=flux[i]*flux[i-lag];if(score>best){best=score;bpm=tempo;}}
 for(let bin=0;bin<96;bin++){let value=0;for(let i=Math.floor(bin*data.length/96);i<Math.floor((bin+1)*data.length/96);i+=8)value=Math.max(value,Math.abs(data[i]));wave.push(value/Math.max(.01,peak));}
 return {bpm,wave};
}

async function prepare(track:DJTrack,context:AudioContext,signal:AbortSignal):Promise<Prepared>{
 const response=await fetch(track.url,{signal});if(!response.ok)throw Error('Track unavailable');
 if(Number(response.headers.get('content-length'))>64*1024*1024)throw Error('Track exceeds preview limit');
 const bytes=await response.arrayBuffer();if(bytes.byteLength>64*1024*1024)throw Error('Track exceeds preview limit');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 if(hash!==track.sha256)throw Error('Prepared track checksum changed');
 const decoded=await context.decodeAudioData(bytes);if(signal.aborted)throw Error('Cancelled');
 if(decoded.duration<8||decoded.duration>360||decoded.numberOfChannels>2)throw Error('Unsupported prepared track');
 const frames=Math.min(decoded.length,Math.floor(context.sampleRate*96));
 const buffer=context.createBuffer(2,frames,context.sampleRate);
 for(let c=0;c<2;c++)buffer.copyToChannel(decoded.getChannelData(Math.min(c,decoded.numberOfChannels-1)).subarray(0,frames),c);
 return {track,buffer,...inspectPCM(buffer.getChannelData(0),buffer.sampleRate)};
}

export class AIDJPlayer{
 context:AudioContext;
 mixer:ReturnType<typeof createMixer>;
 private decks:(Deck|null)[]=[null,null];
 private active=0;
 private blend:Blend|null=null;
 private state:DJSnapshot['status']='idle';
 private message='Choose a mood, then start your set.';
 private direction:Direction={energy:3,mood:'warm',vocals:true};
 private master=.65;
 private mode:'auto'|'together'='auto';
 private tone=0;
 private echo=0;
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
 constructor(private changed:(snapshot:DJSnapshot)=>void,private tracks=djTracks){
  this.context=new AudioContext();this.mixer=createMixer(this.context);this.mixer.meter.fftSize=256;
  this.applyMaster();this.context.onstatechange=()=>{if(this.context.state!=='running'&&this.running)this.stop('Audio was interrupted. Press Start set to resume.');};
 }
 private get running(){return this.state==='playing'||this.state==='closing';}
 snapshot():DJSnapshot{
  const now=this.context.currentTime;
  const cross=this.blend?Math.max(0,Math.min(1,(now-this.blend.at)/(this.blend.end-this.blend.at))):0;
  const active=this.decks[this.active];
  this.mixer.meter.getFloatTimeDomainData(this.meter);
  return {status:this.state,message:this.message,direction:{...this.direction},master:this.master,mode:this.mode,tone:this.tone,echo:this.echo,cross:this.blend?(this.blend.to===1?cross:1-cross):this.active,elapsed:this.running?Math.max(0,now-this.began):this.endedElapsed,remaining:this.endAt===null?null:Math.max(0,this.endAt-now),transitionIn:this.blend?Math.max(0,this.blend.at-now):active&&this.running?Math.max(0,transitionTime(active.start,active.buffer.duration,active.bpm,now,this.early).at-now):null,history:[...this.history],peak:Math.max(...this.meter.map(Math.abs)),decks:this.decks.map(d=>{
   if(!d)return null;let position=d.source?Math.max(0,now-d.start):0;const length=d.buffer.duration;
   if(position>length){const loop=Math.min(length/2,240/d.bpm*4);position=length-loop+(position-length)%loop;}
   return {title:d.track.title,artist:d.track.artist,vocal:d.track.vocal,bpm:d.bpm,duration:length,position,playing:!!d.source&&now>=d.start,wave:d.wave};
  })};
 }
 private emit(){if(!this.disposed)this.changed(this.snapshot());}
 async start(){
  if(this.disposed||this.running||this.state==='loading')return;
  this.stopSources();this.history=[];this.unavailable.clear();this.endedElapsed=0;this.endAt=null;this.active=0;this.blend=null;this.early=false;
  this.state='loading';this.message='Preparing the first track…';const run=++this.request;this.emit();
  try{
   await this.context.resume();if(run!==this.request)return;
   const prepared=await this.loadCandidate();if(run!==this.request||!prepared)return;
   this.decks[0]={...prepared,start:0};this.began=this.context.currentTime+.1;this.beginDeck(0,this.began,1);
   this.history=[prepared.track.id];this.state='playing';this.message='Set started. Preparing the next groove.';this.applyMaster();
   this.interval=setInterval(()=>this.tick(),100);this.emit();void this.prepareNext();
  }catch{if(run===this.request){this.state='error';this.message='The prepared music could not load. Check your connection and try Start set again.';this.emit();}}
 }
 private async loadCandidate():Promise<Prepared|null>{
  while(!this.disposed){
   const remaining=this.endAt===null?Infinity:this.endAt-this.context.currentTime;
   const direction=remaining<120?{...this.direction,energy:Math.min(this.direction.energy,2)}:this.direction;
   const track=pickTrack(this.tracks,direction,this.history,this.unavailable,this.endAt!==null);
   if(!track)throw Error('No prepared tracks remain');
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
  try{const prepared=await this.loadCandidate();if(run!==this.request||!this.running||!prepared)return;
   this.decks[1-this.active]={...prepared,start:Infinity};this.message=this.endAt===null?'Next track ready. The AI will blend it in.':'Closing sequence ready.';
  }catch{if(run===this.request)this.message='No next track could load. Holding the current groove; stop and restart to retry.';}
  finally{if(run===this.request){this.loading=false;this.emit();}}
 }
 private beginDeck(index:number,at:number,gainValue:number){
  const deck=this.decks[index]!;const source=this.context.createBufferSource(),gain=this.context.createGain();
  source.buffer=deck.buffer;source.loop=true;source.loopStart=deck.buffer.duration-Math.min(deck.buffer.duration/2,240/deck.bpm*4);source.loopEnd=deck.buffer.duration;
  source.connect(gain);gain.connect(this.mixer.strips[index].input);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(gainValue,at+.02);
  deck.start=at;deck.source=source;deck.gain=gain;source.start(at);
 }
 private tick(){
  if(!this.running)return;
  const now=this.context.currentTime;
  if(this.endAt!==null&&now>=this.endAt){this.stop('Set finished. Thanks for the music.');return;}
  if(this.blend&&now>=this.blend.end){
   const {from,to}=this.blend;this.release(from);this.active=to;this.history=[...this.history,this.decks[to]!.track.id].slice(-12);this.blend=null;this.early=false;
   this.message=this.endAt===null?'New groove playing. Preparing what comes next.':'Closing set · preparing the final stretch.';void this.prepareNext();
  }
  if(!this.blend&&this.decks[this.active]&&this.decks[1-this.active]){
   const deck=this.decks[this.active]!,timing=transitionTime(deck.start,deck.buffer.duration,deck.bpm,now,this.early);
   if(timing.at<=now+2&&(this.endAt===null||timing.at+timing.fade+4<this.endAt)){
    const to=1-this.active;this.beginDeck(to,timing.at,0);const incoming=this.decks[to]!;
    deck.gain!.gain.cancelScheduledValues(now);deck.gain!.gain.setValueAtTime(1,now);deck.gain!.gain.setValueAtTime(1,timing.at);deck.gain!.gain.linearRampToValueAtTime(0,timing.at+timing.fade);
    incoming.gain!.gain.cancelScheduledValues(timing.at);incoming.gain!.gain.setValueAtTime(0,timing.at);incoming.gain!.gain.linearRampToValueAtTime(1,timing.at+timing.fade);
    this.blend={from:this.active,to,at:timing.at,end:timing.at+timing.fade};this.message='Blending into '+incoming.track.title+'.';
   }
  }
  this.emit();
 }
 private cancelFuture(){
  if(this.blend&&this.context.currentTime>=this.blend.at)return false;
  if(this.blend){const current=this.decks[this.active];current?.gain?.gain.cancelScheduledValues(this.context.currentTime);current?.gain?.gain.setValueAtTime(1,this.context.currentTime);this.blend=null;}
  this.abort?.abort();this.request++;this.loading=false;this.release(1-this.active);return true;
 }
 setDirection(change:Partial<Direction>){
  if(change.energy!==undefined&&(!Number.isFinite(change.energy)||change.energy<1||change.energy>5))return;
  if(change.mood!==undefined&&!['warm','bright','deep'].includes(change.mood))return;
  this.direction={...this.direction,...change};
  if(this.running&&this.cancelFuture()){this.message='Direction updated. Preparing the next track.';void this.prepareNext();}
  else this.message=this.running?'Direction saved for after this transition.':'Direction ready for your next set.';
  this.emit();
 }
 next(){if(!this.running)return;this.early=true;this.message=this.decks[1-this.active]?'Next track will enter at the next estimated bar.':'Preparing a track before changing the music.';this.tick();}
 finish(seconds:number|null){
  if(!this.running)return;
  if(seconds!==null&&(!Number.isFinite(seconds)||seconds<10||seconds>3600))return;
  const now=this.context.currentTime,deck=this.decks[this.active]!,bar=240/deck.bpm;
  const duration=seconds??Math.max(10,deck.buffer.duration-(now-deck.start));
  this.endAt=deck.start+Math.ceil((now+duration-deck.start)/bar)*bar;this.state='closing';
  if(this.cancelFuture())void this.prepareNext();this.applyMaster();this.message='Winding down to a smooth finish.';this.emit();
 }
 continue(){if(!this.running)return;this.endAt=null;this.state='playing';this.applyMaster();if(this.cancelFuture())void this.prepareNext();this.message='The party continues. Closing plan cancelled.';this.emit();}
 private applyMaster(){
  const now=this.context.currentTime,level=this.running?this.master*.8:0,fade=this.endAt===null?1:Math.max(0,Math.min(1,(this.endAt-now)/8));
  this.mixer.channels.forEach(channel=>{const gain=channel.gain;gain.cancelScheduledValues(now);gain.setTargetAtTime(level*fade,now,.02);if(this.endAt!==null){gain.setValueAtTime(level*fade,Math.min(this.endAt,Math.max(now+.03,this.endAt-8)));gain.linearRampToValueAtTime(0,this.endAt);}});
 }
 setMaster(value:number){if(!Number.isFinite(value)||value<0||value>1)return;this.master=value;this.applyMaster();this.emit();}
 setMode(value:'auto'|'together'){this.mode=value;if(value==='auto'){this.tone=0;this.echo=0;this.applyEffects();}this.emit();}
 effects(tone:number,echo:number){if(this.mode!=='together'||![tone,echo].every(Number.isFinite)||tone<-12||tone>12||echo<0||echo>.3)return;this.tone=tone;this.echo=echo;this.applyEffects();this.emit();}
 private applyEffects(){const now=this.context.currentTime;this.mixer.strips.forEach(strip=>{strip.eq[0].gain.setTargetAtTime(this.tone,now,.03);strip.eq[2].gain.setTargetAtTime(-this.tone/2,now,.03);strip.fx.wet.gain.setTargetAtTime(this.echo,now,.03);strip.fx.dry.gain.setTargetAtTime(1-this.echo,now,.03);});}
 private release(index:number){
  const deck=this.decks[index];this.decks[index]=null;
  if(deck?.source){const source=deck.source,gain=deck.gain!,now=this.context.currentTime;
   gain.gain.cancelAndHoldAtTime(now);gain.gain.linearRampToValueAtTime(0,now+.01);
   source.onended=()=>{source.disconnect();gain.disconnect();};try{source.stop(now+.01);}catch{source.disconnect();gain.disconnect();}
  }
 }
 private stopSources(){this.abort?.abort();this.abort=null;this.request++;this.loading=false;clearInterval(this.interval);this.interval=undefined;this.release(0);this.release(1);this.blend=null;}
 stop(message='Set stopped. Start again whenever you’re ready.'){
  if(this.running)this.endedElapsed=Math.max(0,this.context.currentTime-this.began);this.stopSources();this.state='stopped';this.endAt=null;this.early=false;this.message=message;this.applyMaster();this.emit();
 }
 dispose(){this.stop();this.disposed=true;this.context.onstatechange=null;void this.context.close();}
}
