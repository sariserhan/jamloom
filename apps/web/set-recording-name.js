export function recordingTitle(value){
 return Array.from(typeof value==='string'?value.normalize('NFKC').replace(/[\p{C}]/gu,'').replace(/\s+/gu,' ').trim():'').slice(0,80).join('');
}
export function recordingFileStem(value){
 const name=Array.from(recordingTitle(value).toLowerCase().replace(/[^\p{L}\p{M}\p{N} -]/gu,'').replace(/[ -]+/g,'-')).slice(0,50).join('').replace(/^-|-$/g,'');
 return name?name+'-jamloom':'jamloom-set';
}
