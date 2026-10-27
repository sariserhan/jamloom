export {singingOffer} from './singing-offer.js';
export const songStages=['Start singing','Build control','Rhythm & range','Independent performance'];
export const stages=['Find your voice','Move between notes','Sing in time','Put it together'];
// Original Jamloom exercises: semitone offsets and beat lengths, never imported songs.
export const singingLessons=[
 {id:'first-note',stage:0,title:'Find your note',symbol:'●',hold:2,notes:[[0,2]],instruction:'Hear the piano. Hum it back and hold the center for two seconds.',tip:'Start with a gentle hum. Choose a note that feels easy.'},
 {id:'steady-note',stage:0,title:'Keep it steady',symbol:'━',hold:3,notes:[[0,3]],instruction:'Keep the same note steady for three seconds.',tip:'Use a comfortable volume. Listen for a steady pitch, not a louder voice.'},
 {id:'longer-phrase',stage:0,title:'Carry the phrase',symbol:'━━',hold:4,notes:[[0,4]],instruction:'Take an easy breath, then hold one note for four seconds.',tip:'Let the air out gently. Stop and rest if the exercise feels uncomfortable.'},
 {id:'step-up',stage:1,title:'Step upward',symbol:'↗',notes:[[0,2],[2,2],[4,2]],instruction:'Echo three rising notes. Follow each highlighted note.',tip:'Move a little higher each time. Keep the same comfortable volume.'},
 {id:'step-down',stage:1,title:'Come back down',symbol:'↘',notes:[[4,2],[2,2],[0,2]],instruction:'Echo three falling notes and return to the starting pitch.',tip:'Hear the whole shape before you begin. Let each note settle.'},
 {id:'thirds',stage:1,title:'Make a small leap',symbol:'⌁',notes:[[0,2],[4,2],[0,2]],instruction:'Sing the first note, move up a third, then return.',tip:'Imagine the middle note before singing it. Avoid sliding through the gap.'},
 {id:'pulse',stage:2,title:'Catch the pulse',symbol:'••••',notes:[[0,1],[null,1],[0,1],[null,1],[0,1],[null,1],[0,1],[null,1]],instruction:'Sing four short notes. Leave a silent beat between them.',tip:'Follow the count-in. Silence is part of this exercise too.'},
 {id:'long-short',stage:2,title:'Long and short',symbol:'━ • ━',notes:[[0,2],[null,1],[2,1],[null,1],[0,2]],instruction:'Echo a long note, a short note, then another long note.',tip:'Keep each note until its bar ends. Use the rests to prepare the next one.'},
 {id:'rests',stage:2,title:'Give music space',symbol:'• — •',notes:[[0,1],[null,2],[2,1],[null,1],[4,2]],instruction:'Keep time through the rests, then enter on the next note.',tip:'Count the empty beats quietly in your head.'},
 {id:'first-melody',stage:3,title:'Your first melody',symbol:'⌁⌁',notes:[[0,1],[2,1],[4,2],[2,1],[0,2]],instruction:'Bring pitch and timing together in a five-note melody.',tip:'Listen for the shape: rise, stay, then come home.'},
 {id:'melody-groove',stage:3,title:'Find the groove',symbol:'♫',notes:[[0,1],[null,1],[4,1],[2,1],[0,2],[null,1],[2,1],[0,2]],instruction:'Echo the melody with clear notes and deliberate rests.',tip:'Optional percussion gives you a pulse. Use headphones if you turn it on.'},
 {id:'final-performance',stage:3,title:'Make it yours',symbol:'✦',notes:[[0,1],[2,1],[4,2],[null,1],[5,1],[4,1],[2,1],[null,1],[0,3]],instruction:'Perform the complete phrase: accurate notes, clean entries and quiet rests.',tip:'Practice as often as you like. Completion marks these exercises, not professional certification.'},
];
export const lessonById=id=>[...singingLessons,...singingSongs].find(l=>l.id===id);
export function phraseFor(lesson,root=57,tempo=80,section='all'){
 if(![...singingLessons,...singingSongs].includes(lesson)||![45,57,69].includes(root)||(!Number.isInteger(tempo)||tempo<60||tempo>128)||section!=='all'&&(!lesson.song||!Number.isInteger(section)||section<0||section>3))throw Error('Invalid course settings');
 let at=0,lyricIndex=-1;const full=lesson.notes.map(([offset,beats],index)=>{const duration=beats*60/tempo;if(lesson.lyrics?.[index])lyricIndex=index;else if(offset===null)lyricIndex=-1;const note={note:offset===null?null:root+offset,at,duration,lyric:lesson.lyrics?.[lyricIndex]||'',lyricIndex,sourceIndex:index};at+=duration;return note;});
 if(section==='all')return full;
 const beat=60/tempo,start=(4+16*section)*beat,end=start+16*beat;
 return [{note:null,at:0,duration:4*beat,lyric:'',sourceIndex:0},...full.filter(n=>n.at>=start-1e-6&&n.at<end-1e-6).map(n=>({...n,at:n.at-start+4*beat})),{note:null,at:20*beat,duration:4*beat,lyric:'',sourceIndex:full.length-1}];
}
export function weakestSection(lesson,details){
 const phrase=phraseFor(lesson,57,60),totals=[0,0,0,0],counts=[0,0,0,0];
 for(let i=0;i<phrase.length;i++){const n=phrase[i],section=Math.floor((n.at-4)/16);if(n.note!==null&&section>=0&&section<4){totals[section]+=Math.max(0,Math.min(1,details[i]?.coverage||0));counts[section]++;}}
 return totals.map((value,i)=>value/Math.max(1,counts[i])).indexOf(Math.min(...totals.map((value,i)=>value/Math.max(1,counts[i]))));
}
export {progressKey} from './singing-progress.js';
import {progressKey,readProgress as readSavedProgress} from './singing-progress.js';
export const readProgress=storage=>readSavedProgress(storage);
export function saveAttempt(storage,id,result){
 if(!lessonById(id)||!Number.isFinite(result.score)||result.score<0||result.score>100||typeof result.passed!=='boolean')throw Error('Invalid practice result');
 const progress=readProgress(storage),old=progress[id];progress[id]={best:Math.max(old?.best||0,Math.round(result.score)),attempts:Math.min(1000000,(old?.attempts||0)+1),passed:!!old?.passed||result.passed};storage.setItem(progressKey,JSON.stringify(progress));return progress;
}

// Original practice songs with lyrics and a known vocal melody; no commercial recordings.
const cityWords=['Wake with me','Find the morning','Take one breath','Let it go','Feet on pavement','Sky turns gold','Hear our rhythm','Let it grow','City lights shine','We belong here','Every small step','Brings us near','Lift your voice','Into the night','Stay with me','We are light'];
const motionWords=['Feel the motion','Under our feet','Take one moment','Follow the beat','Find your courage','Let it rise','Keep us moving','Through the night','We move together','Into the glow','Hearts keep dancing','Let it flow','Bring your rhythm','Make it bright','We move together','Through the night'];
function song(id,title,tempo,minor,words,shapes,options={}){
 const notes=[[null,4]],lyrics=[''],beats=options.beats||[1,1,2];
 for(const [i,shape] of shapes.entries()){for(const [j,n] of shape.entries()){notes.push([n,beats[j]]);lyrics.push(words[i].split(' ')[j]);}const rest=4-beats.reduce((a,b)=>a+b,0);if(rest>0){notes.push([null,rest]);lyrics.push('');}}
 notes.push([null,4]);lyrics.push('');return {id,title,tempo,minor,song:true,credit:'Original Jamloom practice song',lines:words,stage:3,level:options.level||0,focus:options.focus||'Pitch and phrasing',coach:options.coach||'Hear the complete phrase, then keep the long vowels steady.',symbol:'♫',chords:options.chords,style:options.style||(minor?'Dance / house':'Bright pop'),notes,lyrics,instruction:'Sing an original song with the band. Follow the lyrics and the moving melody line.',tip:'Use headphones. Hear song plays the piano vocal guide; Sing along leaves the melody to your voice.'};
}
export const singingSongs=[
 song('first-light','First Light',76,false,['Morning comes softly','Open the window','Take your time','Here we begin','One small sound','Floats through silence','Breathe then sing','Let daylight in','Keep it gentle','Keep it simple','Hold this moment','Let it ring','Morning comes softly','We are ready','One small sound','Starts everything now'],[[0,2,4],[4,2,0],[0,2,4],[4,2,0],[0,2,4],[4,2,0],[2,4,2],[2,0,0],[0,2,4],[4,2,0],[0,2,4],[4,2,0],[0,2,4],[4,2,0],[2,4,2],[2,0,0]],{focus:'Gentle entries and steady pitch',coach:'Use the quiet beat after each line to breathe. Aim for a comfortable sound, not more volume.',style:'Gentle pop',beats:[1,1,1]}),

 song('city-lights','City Lights',90,false,cityWords,[[0,2,4],[9,7,4],[5,4,2],[7,4,2],[0,2,4],[9,7,4],[5,4,2],[7,2,0],[4,7,9],[9,7,4],[5,7,9],[7,4,2],[4,7,9],[9,7,4],[5,4,2],[7,2,0]]),
 song('in-motion','In Motion',112,true,motionWords,[[0,3,7],[8,7,3],[5,7,8],[7,5,3],[0,3,7],[8,7,3],[5,3,0],[7,3,0],[7,10,7],[8,7,3],[5,8,7],[7,5,3],[7,10,7],[8,7,3],[5,3,0],[7,3,0]],{level:1,focus:'Minor melody and pulse',coach:'Prepare each change before the playhead reaches it. Keep the pulse through longer notes.'}),
 song('open-road','Open Road',94,false,['Leave the doorway','Walk beside me','Follow the river','Out to sea','Every new turn','Opens a window','Carry the tune','Set it free','Over the hill','Under the sky','Carry our story','Let it fly','Step into daylight','Stay in motion','Follow the river','Home with me'],[[0,4,7],[9,7,4],[5,2,5],[7,4,2],[0,4,7],[9,4,7],[5,9,5],[7,2,0],[4,7,12],[9,7,4],[5,9,12],[7,11,7],[4,7,9],[9,4,7],[5,2,5],[7,2,0]],{level:1,focus:'Accurate melodic leaps',coach:'Listen to the destination note before each leap. Practice a section slowly, then return to the full song.',style:'Acoustic pop'}),
 song('after-hours','After Hours',104,true,['Streetlights keep glowing','Footsteps find rhythm','Wait for that','Late night train','Shadows move slowly','We keep talking','Leave room for','One more refrain','After the rush','We find space','Turn toward tomorrow','Find your place','Streetlights keep glowing','Footsteps find rhythm','Hold onto this','Quiet embrace now'],[[0,3,7],[8,7,3],[5,8,5],[7,3,0],[0,7,3],[8,3,7],[5,8,7],[7,3,0],[3,7,10],[8,7,3],[5,8,10],[7,5,3],[3,7,10],[8,3,7],[5,8,5],[7,3,0]],{level:2,focus:'Offbeat entries',coach:'The first word is short. Place the second word between beats, then let the long word settle.',style:'Late-night groove',beats:[.5,1.5,2]}),
 song('river-flow','River Flow',84,false,['Water keeps moving','Over the stones','Carry our echoes','Bring us home','Take one breath','Give it room','Let every phrase','Open and bloom','River keep flowing','Strong and clear','Hold the horizon','Draw it near','Water keeps moving','Over the stones','Carry our echoes','Bring us home'],[[0,2,4],[9,7,4],[5,7,9],[7,4,2],[0,4,7],[9,7,4],[5,9,7],[7,2,0],[4,7,12],[9,7,4],[5,9,12],[7,11,7],[4,7,9],[9,7,4],[5,4,2],[7,2,0]],{level:2,focus:'Long notes and clean releases',coach:'Keep the final vowel even for the full bar. Release before the next phrase without pushing your volume.',style:'Flowing ballad',beats:[.5,.5,3]}),
 song('skyline','Skyline',108,false,['Raise your eyes','Across the skyline','Carry this melody','Into the blue','Far from yesterday','Closer to morning','Find your own','Way coming through','Rise with intention','Land with control','Every bright note','Makes us whole','Across the skyline','Carry this melody','Find your own','Way coming through'],[[0,7,12],[9,4,7],[5,12,9],[7,2,7],[0,4,12],[9,7,4],[5,9,12],[7,11,7],[4,12,7],[9,4,12],[5,12,9],[7,2,7],[4,7,12],[9,7,4],[5,9,12],[7,2,0]],{level:3,focus:'Octave range with clear entries',coach:'Choose a lower register if the high notes feel uncomfortable. Use section practice to prepare each large leap.',style:'Anthem pop',beats:[1,1,1]}),
 song('own-the-night','Own the Night',120,true,['Here we stand','Ready for motion','Find our rhythm','Make it bright','Cross the silence','Answer the moment','Carry the chorus','Through the night','We move freely','We keep listening','Every new phrase','Finds its place','Here we stand','Ready for motion','Carry the chorus','Through the night'],[[0,7,12],[8,3,7],[5,12,8],[7,3,0],[0,3,10],[8,7,3],[5,8,12],[7,10,7],[3,12,7],[8,3,10],[5,12,8],[7,3,0],[3,7,12],[8,7,3],[5,8,12],[7,3,0]],{level:3,focus:'Independent full-song performance',coach:'Use Hear song to learn the shape, then perform without the piano guide. Recover at the next phrase if you miss a note.',style:'Dance finale',beats:[.5,1.5,2]}),

];

// Reviewed score sources and separate lyric/recording provenance: assets/manifests/singing-catalogue.json.
function scoredSong(id,title,tempo,bars,options){
 const notes=[[null,4]],lyrics=[''];
 for(const bar of bars)for(const [pitch,beats,word] of bar){notes.push([pitch,beats]);lyrics.push(word||'');}
 notes.push([null,4]);lyrics.push('');
 return {...song(id,title,tempo,false,[],[],options),notes,lyrics,lines:bars.map(bar=>bar.map(n=>n[2]).filter(Boolean).join(' ')),credit:options.credit,sections:options.sections,instruction:options.instruction};
}
const bells=[
 [[0,1,'Frère'],[2,1,''],[4,1,'Jacques'],[0,1,'']],
 [[0,1,'Frère'],[2,1,''],[4,1,'Jacques'],[0,1,'']],
 [[4,1,'Dormez-vous?'],[5,1,''],[7,2,'']],
 [[4,1,'Dormez-vous?'],[5,1,''],[7,2,'']],
 [[7,.5,'Sonnez'],[9,.5,''],[7,.5,'les'],[5,.5,'matines'],[4,1,''],[0,1,'']],
 [[7,.5,'Sonnez'],[9,.5,''],[7,.5,'les'],[5,.5,'matines'],[4,1,''],[0,1,'']],
 [[0,1,'Ding,'],[7,1,'dang,'],[0,2,'dong.']],
 [[0,1,'Ding,'],[7,1,'dang,'],[0,2,'dong.']],
];
singingSongs.push(
 song('paper-kites','Paper Kites',88,false,['Paper kites rise','Over our street','Hands catch sunlight','Feet find beats','Let the wind','Carry this tune','Past every rooftop','Into the blue','We rise slowly','We land softly','Keep one promise','Stay close by','Paper kites rise','Over our street','Sing this together','Come fly free'],[[0,2,7],[7,4,2],[5,9,7],[4,2,0],[0,4,7],[9,7,4],[5,4,2],[2,7,0],[4,7,9],[9,7,4],[5,9,7],[7,4,2],[0,2,7],[7,4,2],[5,4,2],[2,7,0]],{level:1,style:'Acoustic soul',focus:'Smooth leaps and a relaxed pulse',coach:'Hear the destination note before each leap. Use the long final word to settle.',chords:[[0,4,7],[5,9,12],[9,12,16],[7,11,14]]}),
 song('neon-tide','Neon Tide',116,true,['Neon tides turn','Under our feet','Small sparks gather','Out in streets','Send one signal','Across the room','Find that feeling','Make it bloom','Hold this rhythm','Let hearts move','Keep us turning','Into the groove','Neon tides turn','We come alive','Send one signal','Ride this tide'],[[0,3,5],[7,5,3],[8,7,5],[3,0,3],[0,5,7],[10,7,5],[8,5,3],[7,3,0],[3,7,10],[12,10,7],[8,7,5],[7,5,3],[0,3,5],[7,5,3],[8,5,7],[3,7,0]],{level:2,style:'Electronic pop',focus:'Short pickups and long vowels',coach:'Place the short first word on the beat, then let the phrase open up.',beats:[.5,1.5,2],chords:[[0,3,7],[5,8,12],[8,12,15],[7,10,14]]}),
 scoredSong('frere-jacques','Frère Jacques',96,[...bells,...bells],{sections:['First call','First answer','Repeat the call','Repeat the answer'],level:0,style:'French round · warm groove',focus:'Connected syllables and repeated phrases',coach:'Sing each phrase twice. One word can travel across several notes. The closing bell uses an upper-octave G in this arrangement.',credit:'Traditional French melody and lyrics · Jamloom arrangement',instruction:'Sing the complete French round twice with the band. Keep each highlighted word connected across its notes.',chords:[[0,4,7],[0,4,7],[0,4,7],[0,4,7]]}),
 scoredSong('ode-to-joy','Ode to Joy',100,[
 [[4,1,'Sing'],[4,1,'with'],[5,1,'me'],[7,1,'now']],
 [[7,1,'Let'],[5,1,'the'],[4,1,'light'],[2,1,'in']],
 [[0,1,'Lift'],[0,1,'your'],[2,1,'voice'],[4,1,'and']],
 [[4,1.5,'Let'],[2,.5,'it'],[2,2,'ring']],
 [[4,1,'Step'],[4,1,'by'],[5,1,'step'],[7,1,'we']],
 [[7,1,'Find'],[5,1,'our'],[4,1,'way'],[2,1,'home']],
 [[0,1,'Hear'],[0,1,'the'],[2,1,'joy'],[4,1,'that']],
 [[2,1.5,'We'],[0,.5,'can'],[0,2,'bring']],
 [[2,1,'Through'],[2,1,'the'],[4,1,'rain'],[0,1,'we']],
 [[2,1,'Let'],[4,.5,'each'],[5,.5,'new'],[4,1,'day'],[0,1,'shine']],
 [[2,1,'Let'],[4,.5,'each'],[5,.5,'new'],[4,1,'voice'],[2,1,'rise']],
 [[0,1,'Join'],[2,1,'and'],[7,2,'sing']],
 [[4,1,'Sing'],[4,1,'with'],[5,1,'me'],[7,1,'now']],
 [[7,1,'Let'],[5,1,'the'],[4,1,'light'],[2,1,'in']],
 [[0,1,'Lift'],[0,1,'your'],[2,1,'voice'],[4,1,'and']],
 [[2,1.5,'Let'],[0,.5,'it'],[0,2,'ring']],
 ],{sections:['Opening theme','Theme repeated','Bridge','Final theme'],level:1,style:'Classical theme · pop arrangement',focus:'Stepwise melody and dotted rhythm',coach:'Keep the pulse steady through the shorter notes. These English practice lyrics were written for Jamloom.',credit:'L. van Beethoven · original English practice lyrics and arrangement by Jamloom',instruction:'Sing Beethoven’s familiar melody with new English practice lyrics. Follow the full verse and the moving pitch line.',chords:[[0,4,7],[0,4,7],[0,4,7],[7,11,14],[0,4,7],[0,4,7],[7,11,14],[0,4,7],[7,11,14],[7,11,14],[7,11,14],[7,11,14],[0,4,7],[0,4,7],[7,11,14],[0,4,7]]})
);

singingSongs.sort((a,b)=>a.level-b.level);
