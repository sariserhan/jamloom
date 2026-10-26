class SingingCapture extends AudioWorkletProcessor {
 constructor(){super();this.size=Math.min(8192,2**Math.ceil(Math.log2(sampleRate*.08)));this.ring=new Float32Array(this.size);this.position=0;this.total=0;this.hop=Math.round(sampleRate*.02);this.pending=false;this.running=true;this.port.onmessage=({data})=>{if(data==='stop')this.running=false;else if(data==='ack')this.pending=false;};}
 process(inputs){
  if(!this.running)return false;
  const mono=inputs[0]?.[0];if(!mono)return true;
  for(let i=0;i<mono.length;i++){
   this.ring[this.position]=mono[i];this.position=(this.position+1)%this.size;this.total++;
   if(this.total>=this.size&&this.total%this.hop===0&&!this.pending){
    const samples=new Float32Array(this.size);samples.set(this.ring.subarray(this.position));samples.set(this.ring.subarray(0,this.position),this.size-this.position);
    this.pending=true;this.port.postMessage({samples,frame:currentFrame+i+1,rate:sampleRate},[samples.buffer]);
   }
  }
  return true;
 }
}
registerProcessor('jamloom-singing-capture',SingingCapture);
