export const progressKey='jamloom.singing.course.v1';
// Preserve paid-song progress even when the server returns only free lesson content.
export const progressIds=["first-note","steady-note","longer-phrase","step-up","step-down","thirds","pulse","long-short","rests","first-melody","melody-groove","final-performance","first-light","city-lights","in-motion","open-road","after-hours","river-flow","skyline","own-the-night"];
export function readProgress(storage,ids=progressIds){
 try{const parsed=JSON.parse(storage.getItem(progressKey)||'{}'),clean={};for(const id of ids){const row=parsed?.[id];if(row&&Number.isInteger(row.best)&&row.best>=0&&row.best<=100&&Number.isInteger(row.attempts)&&row.attempts>0&&row.attempts<=1000000&&typeof row.passed==='boolean')clean[id]={best:row.best,attempts:row.attempts,passed:row.passed};}if(storage.getItem('jamloom.singing.first-note.v1')==='passed'&&!clean['first-note'])clean['first-note']={best:100,attempts:1,passed:true};return clean;}catch{return {};}
}
