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
export function phraseFor(lesson,root=57,tempo=80){
 if(![...singingLessons,...singingSongs].includes(lesson)||![45,57,69].includes(root)||(!Number.isInteger(tempo)||tempo<60||tempo>128))throw Error('Invalid course settings');
 let at=0;return lesson.notes.map(([offset,beats],index)=>{const duration=beats*60/tempo;const note={note:offset===null?null:root+offset,at,duration,lyric:lesson.lyrics?.[index]||''};at+=duration;return note;});
}
export const progressKey='jamloom.singing.course.v1';
export function readProgress(storage){
 try{const parsed=JSON.parse(storage.getItem(progressKey)||'{}'),clean={};for(const l of [...singingLessons,...singingSongs]){const row=parsed?.[l.id];if(row&&Number.isInteger(row.best)&&row.best>=0&&row.best<=100&&Number.isInteger(row.attempts)&&row.attempts>0&&row.attempts<=1000000&&typeof row.passed==='boolean')clean[l.id]={best:row.best,attempts:row.attempts,passed:row.passed};}if(storage.getItem('jamloom.singing.first-note.v1')==='passed'&&!clean['first-note'])clean['first-note']={best:100,attempts:1,passed:true};return clean;}catch{return {};}
}
export function saveAttempt(storage,id,result){
 if(!lessonById(id)||!Number.isFinite(result.score)||result.score<0||result.score>100||typeof result.passed!=='boolean')throw Error('Invalid practice result');
 const progress=readProgress(storage),old=progress[id];progress[id]={best:Math.max(old?.best||0,Math.round(result.score)),attempts:Math.min(1000000,(old?.attempts||0)+1),passed:!!old?.passed||result.passed};storage.setItem(progressKey,JSON.stringify(progress));return progress;
}

// Original practice songs with lyrics and a known vocal melody; no commercial recordings.
const cityWords=['Wake with me','Find the morning','Take one breath','Let it go','Feet on pavement','Sky turns gold','Hear our rhythm','Let it grow','City lights shine','We belong here','Every small step','Brings us near','Lift your voice','Into the night','Stay with me','We are light'];
const motionWords=['Feel the motion','Under our feet','Take one moment','Follow the beat','Find your courage','Let it rise','Keep us moving','Through the night','We move together','Into the glow','Hearts keep dancing','Let it flow','Bring your rhythm','Make it bright','We move together','Through the night'];
function song(id,title,tempo,minor,words,shapes){return {id,title,tempo,minor,song:true,lines:words,stage:3,symbol:'♫',style:minor?'Dance / house':'Bright pop',notes:[[null,4],...shapes.flatMap(shape=>shape.map((n,i)=>[n,i===2?2:1])),[null,4]],lyrics:['',...words.flatMap(line=>line.split(' ')),''],instruction:'Sing an original song with the band. Follow the lyrics and the moving melody line.',tip:'Use headphones. Hear song plays the piano vocal guide; Sing along leaves the melody to your voice.'};}
export const singingSongs=[
 song('city-lights','City Lights',90,false,cityWords,[[0,2,4],[9,7,4],[5,4,2],[7,4,2],[0,2,4],[9,7,4],[5,4,2],[7,2,0],[4,7,9],[9,7,4],[5,7,9],[7,4,2],[4,7,9],[9,7,4],[5,4,2],[7,2,0]]),
 song('in-motion','In Motion',112,true,motionWords,[[0,3,7],[8,7,3],[5,7,8],[7,5,3],[0,3,7],[8,7,3],[5,3,0],[7,3,0],[7,10,7],[8,7,3],[5,8,7],[7,5,3],[7,10,7],[8,7,3],[5,3,0],[7,3,0]]),
];
