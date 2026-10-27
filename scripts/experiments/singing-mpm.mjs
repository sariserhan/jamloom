// Offline alternative inspired by the audited vocal-trainer MPM design. No JUCE code or runtime.
// Normalized autocorrelation and key-maximum selection; no target-note conditioning.
export {isSingingPitch} from '../../apps/web/singing-pitch.js';
export function detectPitch(samples,rate){
 if(!(samples instanceof Float32Array)||samples.length<512||samples.length>8192||!Number.isFinite(rate)||rate<8000||rate>192000||!samples.every(x=>Number.isFinite(x)&&Math.abs(x)<=1))return null;
 const mean=samples.reduce((s,x)=>s+x,0)/samples.length,x=Float32Array.from(samples,n=>n-mean);
 const rms=Math.sqrt(x.reduce((s,n)=>s+n*n,0)/x.length);if(rms<.003)return null;
 const min=Math.floor(rate/1000),max=Math.min(Math.floor(rate/80),Math.floor(x.length/2)),values=new Float32Array(max+2);
 if(max<=min)return null;
 for(let lag=0;lag<=max+1;lag++){let dot=0,power=0;for(let i=0;i<x.length-lag;i++){dot+=x[i]*x[i+lag];power+=x[i]**2+x[i+lag]**2;}values[lag]=power?2*dot/power:0;}
 const peaks=[];let negative=false,best=-1;
 for(let lag=1;lag<=max;lag++){
  if(values[lag]<=0){if(best>=min)peaks.push(best);best=-1;negative=true;}
  else if(negative&&(best<0||values[lag]>values[best]))best=lag;
 }
 if(best>=min&&best<max)peaks.push(best);
 if(!peaks.length)return null;
 const top=Math.max(...peaks.map(p=>values[p])),lag=peaks.find(p=>values[p]>=top*.9);
 const y=values[lag],prev=values[lag-1],next=values[lag+1],delta=.5*(prev-next)/(prev-2*y+next||1),frequency=rate/(lag+delta);
 if(frequency<80||frequency>1000)return null;
 return {frequency,confidence:Math.max(0,Math.min(1,y)),rms};
}
