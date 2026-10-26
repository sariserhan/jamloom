export type BeatGrid={bpm:number;offset:number;maxError:number;coverage:number;entry:number;exit:number;hookSafe:boolean;regions?:{start:number;end:number;beats:number}[]};
export function validBeatGrid(grid:BeatGrid){
 if(!grid||![grid.bpm,grid.offset,grid.maxError,grid.coverage,grid.entry,grid.exit].every(Number.isFinite)||grid.bpm<90||grid.bpm>160||grid.offset<0||grid.offset>=60/grid.bpm||grid.maxError<0||grid.maxError>.025||grid.coverage<0||grid.coverage>1||grid.entry<0||grid.exit<=grid.entry+4*60/grid.bpm||typeof grid.hookSafe!=='boolean')return false;
 if(grid.regions===undefined)return grid.coverage>=.8;
 const regions=grid.regions,period=60/grid.bpm;
 return Array.isArray(regions)&&regions.length>0&&regions.length<=40&&grid.coverage>=.25&&regions.every((r,i)=>r&&[r.start,r.end].every(Number.isFinite)&&Number.isSafeInteger(r.beats)&&r.beats>=8&&r.start>=0&&Math.abs(r.end-r.start-(r.beats-1)*period)<.001&&(!i||r.start>regions[i-1].end))&&regions.reduce((sum,r)=>sum+r.beats,0)>=32&&grid.entry===regions[0].start&&grid.exit===regions.at(-1)!.end;
}
// Stable bass or percussion attacks establish a beat lattice, never a downbeat or musical phrase.
export function measureBeatGrid(samples:Float32Array,rate:number,estimate:number):BeatGrid|undefined{
 return measureBand(samples,rate,estimate,false)??measureBand(samples,rate,estimate,true);
}
function measureBand(samples:Float32Array,rate:number,estimate:number,percussion:boolean):BeatGrid|undefined{
 if(estimate>=45&&estimate<=80)estimate*=2;
 if(rate!==8000||samples.length<24*rate||!Number.isFinite(estimate))return;
 const hop=40,envelope:number[]=[];let low=0,prior=0,smoothedPower=0;
 for(let i=0;i<samples.length;i+=hop){for(let j=i;j<Math.min(i+hop,samples.length);j++){low+=(percussion?.5:.1)*(samples[j]-low);const value=percussion?samples[j]-low:low;smoothedPower+=.01*(value*value-smoothedPower);}const value=Math.sqrt(smoothedPower);envelope.push(Math.max(0,value-prior));prior=value;}
 const peaks:{time:number;strength:number}[]=[];
 for(let i=1;i<envelope.length-1;i++){
  if(envelope[i]<=envelope[i-1]||envelope[i]<envelope[i+1])continue;
  let strongest=true;for(let j=Math.max(0,i-8);j<=Math.min(envelope.length-1,i+8);j++)if(envelope[j]>envelope[i]){strongest=false;break;}
  if(strongest)peaks.push({time:i/200,strength:envelope[i]});
 }
 const strongest=[...peaks].sort((a,b)=>b.strength-a.strength).slice(0,Math.floor(samples.length/rate*estimate/60));
 const threshold=(strongest[Math.floor(strongest.length/2)]?.strength??0)*.35;
 if(threshold<.0001)return;
 const attacks=peaks.filter(p=>p.strength>=threshold),duration=samples.length/rate;
 const totalStrength=attacks.reduce((sum,p)=>sum+p.strength,0),tempos=new Map<number,number>();
 // Adjacent strong attacks can reveal the pulse when whole-track autocorrelation chooses a subdivision.
 for(let i=0;i<attacks.length;i++)for(let j=i+1;j<attacks.length&&attacks[j].time-attacks[i].time<=60/90;j++){
  const delta=attacks[j].time-attacks[i].time;if(delta<60/160)continue;
  const bpm=Math.round(60/delta*2)/2;tempos.set(bpm,(tempos.get(bpm)??0)+Math.min(attacks[i].strength,attacks[j].strength));
 }
 const centers=[estimate];for(const [bpm] of [...tempos].sort((a,b)=>b[1]-a[1])){if(centers.every(v=>Math.abs(v-bpm)>2))centers.push(bpm);if(centers.length===4)break;}
 const candidates=new Set<number>();for(const center of centers)for(let n=Math.round(Math.max(90,center-2)*20);n<=Math.round(Math.min(160,center+2)*20);n++)candidates.add(n/20);
 let best:BeatGrid|undefined,bestScore=0;
 for(const bpm of candidates){
  const period=60/bpm;
  for(let offset=0;offset<period;offset+=.005){
   const matched=[0,0,0],expected=[0,0,0],errors=[0,0,0];let score=0,index=0,run=0,runStart=0,last=0,aligned=0,hookSafe=true;const regions:NonNullable<BeatGrid['regions']>=[];
   const finish=()=>{if(run>=8)regions.push({start:runStart,end:last,beats:run});run=0;};
   for(let at=offset+period;at<duration-period;at+=period){
    const part=Math.min(2,Math.floor(at/duration*3));expected[part]++;
    while(index<attacks.length&&attacks[index].time<at-.025)index++;
    let nearest:typeof attacks[number]|undefined;
    for(let j=index;j<attacks.length&&attacks[j].time<=at+.025;j++)if(!nearest||Math.abs(attacks[j].time-at)<Math.abs(nearest.time-at))nearest=attacks[j];
    if(nearest){if(!run)runStart=at;run++;last=at;aligned+=nearest.strength;}else finish();
    if(!nearest&&at>=28&&at<=34)hookSafe=false;
    if(nearest){const error=Math.abs(nearest.time-at);matched[part]++;errors[part]=Math.max(errors[part],error);score+=nearest.strength*(1-error/.03);}
   }
   finish();const coverage=matched.reduce((s,n)=>s+n,0)/Math.max(1,expected.reduce((s,n)=>s+n,0));
   const grid={bpm,offset,maxError:Math.max(...errors),coverage,entry:regions[0]?.start??-1,exit:regions.at(-1)?.end??-1,hookSafe,regions};
   if(aligned/totalStrength>=.35&&validBeatGrid(grid)&&score>bestScore){bestScore=score;best=grid;}
  }
 }
 return best;
}
