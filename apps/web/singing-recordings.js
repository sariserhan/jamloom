// Produced recordings are open practice, separate from verified course scores.
export const singingRecordings=[
 {id:'long-way-home',title:'Long Way Home',style:'Melodic deep house',seconds:120},
 {id:'leave-it-all-outside',title:'Leave It All Outside',style:'Eurodance',seconds:120},
];
export function recordingAsset(id,kind,mobile=false){
 if(!singingRecordings.some(s=>s.id===id)||!['song','karaoke','lyrics'].includes(kind))throw Error('Unknown singing recording');
 return mobile?`./singing-audio/${id}-${kind}.${kind==='lyrics'?'json':'mp3'}`:`/api/singing-recordings/${id}/${kind}`;
}
