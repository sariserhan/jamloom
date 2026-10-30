// Annotation drafts never establish ground truth or enable grading.
export function targetDraft(value, source) {
 if(!value||typeof value!=='object'||Array.isArray(value)||!source||
    value.recordingId!==source.id||value.recordingSha256!==source.sha256||
    !/^[a-f0-9]{64}$/.test(source.sha256)||!Number.isFinite(source.seconds)||source.seconds<=0||source.seconds>600)
  throw Error('This draft does not match the exact recording.');
 if(!Array.isArray(value.words)||value.words.length>2000||!Array.isArray(value.notes)||value.notes.length>4000)
  throw Error('Use bounded words and notes arrays.');
 const validate=(rows,note)=>{
  let previous=0;
  return rows.map(row=>{
   if(!row||!Number.isFinite(row.at)||!Number.isFinite(row.end)||row.at<previous||row.end<=row.at||row.end>source.seconds)
    throw Error('Intervals must be ordered, non-overlapping and inside the recording.');
   previous=row.end;
   if(note){
    if(row.note!==null&&(!Number.isInteger(row.note)||row.note<21||row.note>108))throw Error('Notes use MIDI 21–108, or null for a rest.');
    return {at:row.at,end:row.end,note:row.note};
   }
   if(typeof row.text!=='string'||!row.text.trim()||row.text.length>160||/[\u0000-\u001f]/.test(row.text))throw Error('Each word needs plain, nonempty text.');
   return {at:row.at,end:row.end,text:row.text.trim()};
  });
 };
 return {schema:'jamloom-sung-target-draft-1',recordingId:source.id,recordingSha256:source.sha256,
  seconds:source.seconds,verified:false,scoringEnabled:false,words:validate(value.words,false),notes:validate(value.notes,true)};
}
