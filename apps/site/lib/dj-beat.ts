export type BeatDirection={bpm:number;groove:'steady'|'syncopated'|'rolling'};
export function validBeatDirection(value:unknown):value is BeatDirection{
 const v=value as BeatDirection;return !!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')==='bpm,groove'&&Number.isInteger(v.bpm)&&v.bpm>=90&&v.bpm<=160&&['steady','syncopated','rolling'].includes(v.groove);
}
