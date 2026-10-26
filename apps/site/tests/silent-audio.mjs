// Test-only speaker isolation. Recording taps and the real-time audio clock stay upstream.
export function silenceSpeakers() {
 const connect=AudioNode.prototype.connect, outputs=new Map();
 AudioNode.prototype.connect=function(target,...ports){
  if(target instanceof AudioDestinationNode && !(this.context instanceof OfflineAudioContext)){
   let output=outputs.get(target);
   if(!output){
    const gain=this.context.createGain(),meter=this.context.createAnalyser();gain.gain.value=0;
    connect.call(gain,meter);connect.call(meter,target);output={gain,meter};outputs.set(target,output);
   }
   connect.call(this,output.gain,...ports);return target;
  }
  return connect.call(this,target,...ports);
 };
 // Course fixtures use FrameDeck; prevent incidental native preview/narration output too.
 const play=HTMLMediaElement.prototype.play;
 HTMLMediaElement.prototype.play=function(){this.muted=true;return play.call(this);};
 if(globalThis.speechSynthesis)globalThis.speechSynthesis.speak=()=>{};
 globalThis.__jamloomSilentOutput=()=>Array.from(outputs.values(),({gain,meter})=>{
  const samples=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(samples);
  return {gain:gain.gain.value,peak:Math.max(...samples.map(Math.abs))};
 });
}

// Count node lifetimes, not events: repeated ended notifications must not hide live sources.
export function countAudioSources() {
 const Native=AudioContext,active=new Set(),finished=new WeakSet();
 const counts=globalThis.betaSources={started:0,ended:0,active:0,duplicateEnds:0,unstartedEnds:0};
 globalThis.AudioContext=class extends Native {
  createBufferSource(){
   const source=super.createBufferSource(),start=source.start.bind(source);
   source.start=(...args)=>{const result=start(...args);active.add(source);counts.started++;counts.active=active.size;return result;};
   source.addEventListener('ended',()=>{
    if(finished.has(source)){counts.duplicateEnds++;return;}
    finished.add(source);
    if(active.delete(source))counts.ended++;else counts.unstartedEnds++;
    counts.active=active.size;
   });
   return source;
  }
 };
}
