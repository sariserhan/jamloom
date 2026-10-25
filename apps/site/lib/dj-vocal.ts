export type VocalCue={start:number;seconds:number;bpm:number;repeat:boolean};
import {validBeatGrid,type BeatGrid} from './ai-dj-beat-grid';
export function validVocalCue(cue:VocalCue){return !!cue&&Object.keys(cue).every(k=>['start','seconds','bpm','repeat'].includes(k))&&[cue.start,cue.seconds,cue.bpm].every(Number.isFinite)&&cue.start>=28&&cue.start<=32&&cue.bpm>=120&&cue.bpm<=160&&cue.seconds>0&&cue.seconds<=2&&Math.abs(cue.seconds-240/cue.bpm)<.001&&typeof cue.repeat==='boolean';}
export function vocalLoopReady(cue:VocalCue,grid:BeatGrid|undefined,position:number){
 if(!Number.isFinite(position)||!validVocalCue(cue)||!cue.repeat||!grid||!validBeatGrid(grid)||!grid.hookSafe||Math.abs(grid.bpm-cue.bpm)>.15||position<cue.start-.15||position>cue.start-.01)return false;
 const beat=(cue.start-grid.offset)*grid.bpm/60;
 return Math.abs(beat-Math.round(beat))*60/grid.bpm<=.025;
}
