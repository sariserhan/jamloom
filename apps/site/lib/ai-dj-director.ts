import type {TrackAnalysis} from './ai-dj-analysis';
import practice from '../../web/practice-audio/manifest.json';
import {validationSongs} from './music-validation';

export type Mood='warm'|'bright'|'deep';
export type Direction={energy:number;mood:Mood;vocals:boolean};
export type DJTrack={id:string;title:string;artist:string;url:string;sha256:string;energy:number;mood:Mood;vocal:boolean;credit:string;analysis?:TrackAnalysis;local?:boolean};
const selections:[string,number,Mood][]=[['party-sector',4,'bright'],['black-diamond',5,'deep']];
export const djTracks:DJTrack[]=selections.map(([id,energy,mood])=>{
 const track=practice.tracks.find(t=>t.id===id)!;
 return {id,title:track.title,artist:track.artist,url:'/studio/'+track.url.slice(2),sha256:track.sha256,energy,mood,vocal:false,credit:track.source_page};
});
export const vocalSample=validationSongs.find(t=>t.id==='9547b2b976f83213a4ccb264da6b0cb7')!;


export function pickTrack(tracks:DJTrack[],direction:Direction,history:string[],unavailable:Set<string>,closing=false):DJTrack|undefined{
 const recent=history.slice(-3),sinceVocal=history.slice(-3).every(id=>!tracks.find(t=>t.id===id)?.vocal);
 const vocalDue=direction.vocals&&!closing&&history.length>=3&&sinceVocal;
 let candidates=tracks.filter(t=>!unavailable.has(t.id)&&t.id!==history.at(-1)&&(!t.vocal||vocalDue));
 if(!candidates.length)return undefined;
 const fresh=candidates.filter(t=>!recent.includes(t.id));if(fresh.length)candidates=fresh;
 return [...candidates].sort((a,b)=>{
  const score=(t:DJTrack)=>Math.abs(t.energy-direction.energy)*2+(t.mood===direction.mood?0:1)-(vocalDue&&t.vocal?3:0);
  return score(a)-score(b)||history.lastIndexOf(a.id)-history.lastIndexOf(b.id)||a.id.localeCompare(b.id);
 })[0];
}
export type DJCommand={kind:'direction';change:Partial<Direction>}|{kind:'finish';seconds:number|null}|{kind:'continue'|'stop'|'next'|'hold'}|{kind:'unknown'};
export function parseDJCommand(input:string):DJCommand{
 const text=input.toLowerCase().replace(/[’']/g,'').trim();
 if(!text||text.length>240)return {kind:'unknown'};
 if(/\b(dont|do not|never)\s+(stop|finish|end)\b|\b(keep (the party )?going|continue|cancel (the )?(ending|finish))\b/.test(text))return {kind:'continue'};
 // shortcut: built-in commands only; replace with a validated director when generation is qualified.
 // Negated or mixed instructions need clarification rather than a guessed destructive action.
 if(/\b(dont|do not|not|never|except|without)\b/.test(text)||/\bno\b/.test(text.replace(/\bno vocals\b/g,'')))return {kind:'unknown'};
 if(/\b(stop now|stop immediately|stop music)\b/.test(text)||text==='stop')return {kind:'stop'};
 if(/\b(wrap|finish|end|last track|final track|wind down|party.*over)\b/.test(text)){
  const timed=text.match(/\b(\d+(?:\.\d+)?|one|two|five|ten|fifteen|thirty)\s*(minutes?|mins?|seconds?|secs?)\b/);
  if((/\b(in|after)\b/.test(text)&&!timed&&!/\bafter (this|the current) track\b/.test(text))||(timed&&/[-+]$/.test(text.slice(0,timed.index).trim())))return {kind:'unknown'};
  const values:Record<string,number>={one:1,two:2,five:5,ten:10,fifteen:15,thirty:30};
  const seconds=timed?(values[timed[1]]??Number(timed[1]))*(timed[2].startsWith('m')?60:1):null;
  if(seconds!==null&&(!Number.isFinite(seconds)||seconds<10||seconds>3600))return {kind:'unknown'};
  return {kind:'finish',seconds};
 }
 if(/\b(next track|next song|skip|mix next)\b/.test(text))return {kind:'next'};
 if(/\b(keep (this|the) (vibe|energy)|hold (this|the) (vibe|energy))\b/.test(text))return {kind:'hold'};
 const change:Partial<Direction>={};
 if(/\b(more energy|higher energy|raise.*energy|upbeat|pump it up)\b/.test(text))change.energy=1;
 if(/\b(less energy|lower energy|less intense|calmer|relax|ease off)\b/.test(text)){if(change.energy)return {kind:'unknown'};change.energy=-1;}
 if(/\b(no vocals|instrumental only|fewer vocals|less vocals)\b/.test(text))change.vocals=false;
 else if(/\b(more vocals|occasional vocals|vocal moments|bring.*vocals)\b/.test(text))change.vocals=true;
 if(/\b(warm|soulful)\b/.test(text))change.mood='warm';
 if(/\b(bright|uplifting|happy)\b/.test(text))change.mood='bright';
 if(/\b(deep|deeper|dark|dreamy)\b/.test(text))change.mood='deep';
 return Object.keys(change).length?{kind:'direction',change}:{kind:'unknown'};
}
export function transitionTime(start:number,duration:number,bpm:number,now:number,early=false){
 if(![start,duration,bpm,now].every(Number.isFinite)||duration<8||bpm<60||bpm>180)throw Error('Invalid transition timing');
 const bar=240/bpm,fade=Math.min(bar*4,duration/4,8),phrase=bar*4;
 const natural=start+Math.max(1,Math.floor((duration-fade)/phrase))*phrase;
 const at=early?start+Math.ceil((now+.3-start)/bar)*bar:Math.max(natural,start+Math.ceil((now+.3-start)/phrase)*phrase);
 return {at,fade};
}
