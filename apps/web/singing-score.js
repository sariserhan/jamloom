import {validCommand} from './live-take.js';
// Finite, sample-clock events on the existing instrument worklet, not another audio engine.
export class SingingScore {
 constructor(rate,frame,events){
  if(!Number.isInteger(rate)||rate<32000||rate>192000||!Number.isSafeInteger(frame)||frame<0||!Array.isArray(events)||!events.length||events.length>1024)throw Error('Invalid lesson score');
  let previous=frame;const held=new Set();
  for(const e of events){if(!Number.isSafeInteger(e.frame)||e.frame<previous||e.frame>frame+rate*120||!validCommand(e.command)||!['note','off'].includes(e.command.type))throw Error('Invalid lesson event');previous=e.frame;if(e.command.type==='note'){if(held.has(e.command.id))throw Error('Duplicate lesson voice');held.add(e.command.id);}else if(!held.delete(e.command.id))throw Error('Unpaired lesson release');}
  if(held.size)throw Error('Lesson notes must end');this.frame=frame;this.events=events;this.next=0;
 }
 // WebKit can prime an unconnected worklet before its first real audio-clock callback.
 run(frames,render,emit,clockFrame){if(Number.isSafeInteger(clockFrame)&&clockFrame>this.frame)this.frame=clockFrame;let left=frames;while(left>0){const e=this.events[this.next];if(e&&e.frame<=this.frame){emit(e.command);this.next++;continue;}const n=e?Math.min(left,e.frame-this.frame):left;render(n);this.frame+=n;left-=n;}}
}
export function courseScore(phrase,rate,start,demoOnly,listenAt,endAt,percussion=false,beat=.75){
 const events=[];let id=10000;const note=(at,duration,pitch,patch,velocity)=>{const voice=++id;events.push({frame:Math.round(at*rate),command:{type:'note',id:voice,patch,pitch,velocity}},{frame:Math.round((at+duration)*rate),command:{type:'off',id:voice}});};
 for(const n of phrase)if(n.note!==null)note(start+n.at,n.duration*.75,n.note,0,72);
 if(!demoOnly){for(let i=4;i>0;i--)note(listenAt-i*beat,.06,42,9,45);if(percussion)for(let at=listenAt;at<endAt;at+=beat)note(at,.08,42,9,32);}
 return events.sort((a,b)=>a.frame-b.frame);
}

export function songScore(song,phrase,root,rate,start,guide){
 const events=[];let id=20000;const beat=phrase[0].duration/4,total=phrase.at(-1).at+phrase.at(-1).duration;
 const note=(at,duration,pitch,patch,velocity)=>{const voice=++id;events.push({frame:Math.round((start+at)*rate),command:{type:'note',id:voice,patch,pitch,velocity}},{frame:Math.round((start+at+duration)*rate),command:{type:'off',id:voice}});};
 const chords=song.minor?[[0,3,7],[8,12,15],[5,8,12],[7,10,14]]:[[0,4,7],[9,12,16],[5,9,12],[7,11,14]];
 for(let i=0;i<Math.round(total/beat);i++){const at=i*beat;note(at,.08,i%2===0?36:38,9,52);note(at+beat/2,.045,42,9,35);if(i%2===0)note(at,beat*1.5,root-24+chords[Math.max(0,Math.floor(i/4)-1)%4][0],2,53);if(i%4===0)for(const n of chords[Math.max(0,Math.floor(i/4)-1)%4])note(at,beat*3.4,root-12+n,1,38);}
 if(guide)for(const n of phrase)if(n.note!==null)note(n.at,n.duration*.85,n.note,0,85);
 return events.sort((a,b)=>a.frame-b.frame);
}
