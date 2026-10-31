'use strict';
const select=document.querySelector('#blocks'),frame=document.querySelector('#review');
const status=document.querySelector('#export-status');
let study;
function draft(block){
  try{
    const saved=JSON.parse(localStorage.getItem(`jamloom-owner-review:${study.freeze_sha256}:${block.block_id}`)||'null');
    return saved?.freeze_sha256===study.freeze_sha256&&saved?.block_id===block.block_id?saved.values:null;
  }catch{return null;}
}
function complete(block,values){
  if(!values||values.listener_id!=='owner'||values.attested!==true)return false;
  for(const code of block.codes){
    for(const field of block.rating_fields){
      const options=field.endsWith('_1_5')?['1','2','3','4','5']:['yes','no'];
      if(!options.includes(values[code+'-'+field]))return false;
    }
    if(typeof values[code+'-notes']!=='string'||values[code+'-notes'].length>2000)return false;
  }
  return block.pairs.every(([left,right],i)=>[left,right,'tie'].includes(values['pair-'+i])&&
    typeof values['pair-notes-'+i]==='string'&&values['pair-notes-'+i].length<=2000);
}
function refresh(){
  let finished=0;
  for(const [i,block] of study.blocks.entries()){
    const values=draft(block),done=complete(block,values);finished+=Number(done);
    select.options[i].textContent=`Block ${block.number} · ${done?'Complete':values?'Draft':'Not started'}`;
  }
  document.querySelector('#progress').textContent=`${finished} of ${study.blocks.length} blocks complete. Your own listening judgments are required for each block.`;
}
function choose(index){
  select.selectedIndex=Math.max(0,Math.min(study.blocks.length-1,index));
  frame.src=study.blocks[select.selectedIndex].url;
  document.querySelector('#previous').disabled=select.selectedIndex===0;
  document.querySelector('#next').disabled=select.selectedIndex===study.blocks.length-1;
  refresh();
}
const csv=rows=>'\ufeff'+rows.map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\r\n')+'\r\n';
const note=value=>/^[\s]*[=+\-@]/.test(value)?"'"+value:value;
function download(kind){
  const rows=[kind==='ratings'?study.blocks[0].rating_columns:study.blocks[0].pair_columns];
  let count=0;
  for(const block of study.blocks){
    const values=draft(block);if(!complete(block,values))continue;count++;
    if(kind==='ratings')for(const code of block.codes)rows.push(['owner',block.clip_id,block.block_id,code,
      ...block.rating_fields.map(field=>values[code+'-'+field]),note(values[code+'-notes'])]);
    else for(const [i,[left,right]] of block.pairs.entries())rows.push(['owner',block.clip_id,block.block_id,left,right,
      values['pair-'+i],note(values['pair-notes-'+i])]);
  }
  if(!count){status.textContent='Complete a block from your own listening before downloading judgments.';return;}
  const url=URL.createObjectURL(new Blob([csv(rows)],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=`owner-${kind==='ratings'?'responses':'pairs'}-${study.freeze_sha256.slice(0,12)}.csv`;
  a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  status.textContent=`Downloaded ${kind} for ${count} completed blocks. Download the other file too.`;
}
fetch('study.json').then(r=>{if(!r.ok)throw Error('Study unavailable');return r.json();}).then(value=>{
  study=value;
  for(const block of study.blocks){const option=document.createElement('option');option.value=block.block_id;select.append(option);}
  select.onchange=()=>choose(select.selectedIndex);
  document.querySelector('#previous').onclick=()=>choose(select.selectedIndex-1);
  document.querySelector('#next').onclick=()=>choose(select.selectedIndex+1);
  document.querySelector('#ratings').onclick=()=>download('ratings');document.querySelector('#pairs').onclick=()=>download('pairs');
  window.addEventListener('storage',refresh);choose(0);
}).catch(()=>{document.querySelector('#progress').textContent='The study could not load. Restart the local review server and reload.';});
