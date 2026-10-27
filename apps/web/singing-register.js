import {isSingingPitch} from './singing-pitch.js';

// A starting register from comfortable singing, not a measurement of vocal limits.
export class SingingRegister {
 constructor(){this.notes=[];this.last=-Infinity;}
 observe(seconds,pitch){
  if(!Number.isFinite(seconds)||seconds<this.last+.04)return;
  this.last=seconds;
  if(isSingingPitch(pitch)&&this.notes.length<300)this.notes.push(69+12*Math.log2(pitch.frequency/440));
 }
 result(offsets){
  if(this.notes.length<40)return null;
  const notes=[...this.notes].sort((a,b)=>a-b),center=notes[Math.floor(notes.length/2)];
  const melody=offsets.filter(Number.isFinite).sort((a,b)=>a-b);
  if(!melody.length)return null;
  const middle=melody[Math.floor(melody.length/2)];
  const root=[45,57,69].sort((a,b)=>Math.abs(a+middle-center)-Math.abs(b+middle-center))[0];
  return {root,low:Math.round(notes[Math.floor(notes.length*.1)]),high:Math.round(notes[Math.floor(notes.length*.9)])};
 }
}
