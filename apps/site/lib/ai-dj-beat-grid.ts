export type BeatGrid={bpm:number;offset:number;maxError:number;coverage:number;entry:number;exit:number;hookSafe:boolean};
export function validBeatGrid(grid:BeatGrid){return !!grid&&[grid.bpm,grid.offset,grid.maxError,grid.coverage,grid.entry,grid.exit].every(Number.isFinite)&&grid.bpm>=90&&grid.bpm<=160&&grid.offset>=0&&grid.offset<60/grid.bpm&&grid.maxError>=0&&grid.maxError<=.025&&grid.coverage>=.8&&grid.coverage<=1&&grid.entry>=0&&grid.exit>grid.entry+4*60/grid.bpm&&typeof grid.hookSafe==='boolean';}
// Stable low-frequency attacks establish a beat lattice, never a downbeat or musical phrase.
export function measureBeatGrid(samples:Float32Array,rate:number,estimate:number):BeatGrid|undefined{
 if(estimate>=45&&estimate<=80)estimate*=2;
 if(rate!==8000||samples.length<24*rate||!Number.isFinite(estimate)||estimate<90||estimate>160)return;
 const hop=40,envelope:number[]=[];let low=0,prior=0;
 for(let i=0;i<samples.length;i+=hop){let power=0;for(let j=i;j<Math.min(i+hop,samples.length);j++){low+=.1*(samples[j]-low);power+=low*low;}const value=Math.sqrt(power/hop);envelope.push(Math.max(0,value-prior));prior=value;}
 const peaks:{time:number;strength:number}[]=[];
 for(let i=1;i<envelope.length-1;i++)if(envelope[i]>envelope[i-1]&&envelope[i]>=envelope[i+1])peaks.push({time:i/200,strength:envelope[i]});
 const strongest=[...peaks].sort((a,b)=>b.strength-a.strength).slice(0,Math.floor(samples.length/rate*estimate/60));
 const threshold=(strongest[Math.floor(strongest.length/2)]?.strength??0)*.35;
 if(threshold<.0001)return;
 const attacks=peaks.filter(p=>p.strength>=threshold),duration=samples.length/rate;
 let best:BeatGrid|undefined,bestScore=0;
 for(let bpm=Math.max(90,estimate-2);bpm<=Math.min(160,estimate+2);bpm+=.05){
  const period=60/bpm;
  for(let offset=0;offset<period;offset+=.005){
   const matched=[0,0,0],expected=[0,0,0],errors=[0,0,0];let score=0,index=0,run=0,entry=-1,exit=-1,hookSafe=true;
   for(let at=offset+period;at<duration-period;at+=period){
    const part=Math.min(2,Math.floor(at/duration*3));expected[part]++;
    while(index<attacks.length&&attacks[index].time<at-.025)index++;
    let nearest:typeof attacks[number]|undefined;
    for(let j=index;j<attacks.length&&attacks[j].time<=at+.025;j++)if(!nearest||Math.abs(attacks[j].time-at)<Math.abs(nearest.time-at))nearest=attacks[j];
    run=nearest?run+1:0;if(run>=8){if(entry<0)entry=at-7*period;exit=at;}
    if(!nearest&&at>=28&&at<=34)hookSafe=false;
    if(nearest){const error=Math.abs(nearest.time-at);matched[part]++;errors[part]=Math.max(errors[part],error);score+=nearest.strength*(1-error/.03);}
   }
   const coverage=Math.min(...matched.map((n,i)=>n/Math.max(1,expected[i])));
   if(entry>=0&&exit-entry>4*period&&coverage>=.8&&score>bestScore){bestScore=score;best={bpm,offset,maxError:Math.max(...errors),coverage,entry,exit,hookSafe};}
  }
 }
 return best;
}
