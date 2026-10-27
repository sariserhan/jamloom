// Local diagnostic only. Correlate a known probe, never infer latency from callback CPU time.
export function timingProbe(rate){
 if(!Number.isInteger(rate)||rate<8000||rate>192000)throw Error('Unsupported sample rate');
 const n=Math.round(rate*.02);
 return Float32Array.from({length:n},(_,i)=>{const t=i/rate;return .08*Math.sin(2*Math.PI*(700*t+37500*t*t))*(.5-.5*Math.cos(2*Math.PI*i/(n-1)));});
}
export function findProbe(samples,rate){
 if(!(samples instanceof Float32Array)||samples.length>8192||samples.some(x=>!Number.isFinite(x)||Math.abs(x)>1))return null;
 const step=Math.max(1,Math.floor(rate/12000)),probe=timingProbe(rate).filter((_,i)=>i%step===0),x=samples.filter((_,i)=>i%step===0);
 const mean=probe.reduce((s,n)=>s+n,0)/probe.length,t=Float32Array.from(probe,n=>n-mean),power=t.reduce((s,n)=>s+n*n,0);
 let best=null;
 for(let offset=0;offset+t.length<=x.length;offset++){
  let dot=0,sum=0,square=0;for(let i=0;i<t.length;i++){const v=x[offset+i];dot+=v*t[i];sum+=v;square+=v*v;}
  const ac=Math.max(0,square-sum*sum/t.length),score=ac?Math.abs(dot)/Math.sqrt(power*ac):0;
  if(Math.sqrt(ac/t.length)>=.0005&&score>=.6&&(!best||score>best.score))best={offset:offset*step,score};
 }
 return best;
}
export function timingResult(delays){
 if(!Array.isArray(delays)||delays.length<4||delays.length>5||delays.some(n=>!Number.isFinite(n)||n<0||n>.5))return null;
 const sorted=[...delays].sort((a,b)=>a-b),median=(sorted[Math.floor((sorted.length-1)/2)]+sorted[Math.floor(sorted.length/2)])/2,spread=sorted.at(-1)-sorted[0];
 if(spread>.015)return null;
 return {roundTripMs:median*1000,spreadMs:spread*1000,detectedProbes:delays.length};
}
