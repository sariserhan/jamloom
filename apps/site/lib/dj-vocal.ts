export type VocalCue={start:number;seconds:number;bpm:number;repeat:boolean;echo?:boolean};
import {validBeatGrid,type BeatGrid} from './ai-dj-beat-grid';
export function validVocalCue(cue:VocalCue){return !!cue&&Object.keys(cue).every(k=>['start','seconds','bpm','repeat','echo'].includes(k))&&[cue.start,cue.seconds,cue.bpm].every(Number.isFinite)&&cue.start>=12&&cue.start<=44&&cue.bpm>=120&&cue.bpm<=160&&cue.seconds>0&&cue.seconds<=2&&Math.abs(cue.seconds-240/cue.bpm)<.001&&typeof cue.repeat==='boolean'&&(cue.echo===undefined||typeof cue.echo==='boolean');}
export function vocalPerformanceReady(cue:VocalCue,grid:BeatGrid|undefined,position:number){
 if(!Number.isFinite(position)||!validVocalCue(cue)||(!cue.repeat&&!cue.echo)||!grid||!validBeatGrid(grid)||Math.abs(grid.bpm-cue.bpm)>.15||position<cue.start-.15||position>cue.start-.01)return false;
 const supported=grid.regions?grid.regions.some(r=>r.start-.001<=cue.start&&cue.start+cue.seconds<=r.end+.001):grid.hookSafe&&cue.start>=28&&cue.start<=32;
 if(!supported)return false;
 const beat=(cue.start-grid.offset)*grid.bpm/60;
 return Math.abs(beat-Math.round(beat))*60/grid.bpm<=.025;
}
