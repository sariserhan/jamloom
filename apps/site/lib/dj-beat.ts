export type BeatDirection={bpm:number;groove:'steady'|'syncopated'|'rolling'};
export function validBeatDirection(value:unknown):value is BeatDirection{
 const v=value as BeatDirection;return !!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')==='bpm,groove'&&Number.isInteger(v.bpm)&&v.bpm>=70&&v.bpm<=160&&['steady','syncopated','rolling'].includes(v.groove);
}

export function beatTempo(observed:number,intended?:number){
 const pulse=intended&&Math.abs(observed/2-intended)<intended*.06?observed/2:intended&&Math.abs(observed*2-intended)<intended*.06?observed*2:observed;
 return Math.max(70,Math.min(160,Math.round(pulse)));
}
