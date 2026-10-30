#!/usr/bin/env python3
"""Prepare an anonymous owner comparison against one fixed instrumental bed."""
import argparse
import hashlib
import json
from pathlib import Path
import secrets
import shutil

import numpy as np
from arrange_voice_research import RATE, digest, read_pcm, write_pcm
from source_bass_response import compose
from source_led_response import faded
from q0_audit import loudness, level_match


def prepare(batch, output):
    if output.exists() or output.resolve().is_relative_to(batch.resolve()):
        raise ValueError('Use a fresh review outside the frozen batch')
    report=json.loads((batch/'report.json').read_text())
    if report['technical']!='PASS':raise ValueError('Finish the technical audit first')
    rows=[r for r in report['records'] if r['status']=='PASS technical']
    if not 1<=len(rows)<=50:raise ValueError('Expected a bounded technical batch')
    # Frozen original instrumental bed. No tested input conditions its notes or rhythm.
    t=np.arange(round(1.2*RATE))/RATE
    control=np.repeat((.08*np.sin(2*np.pi*220*t)*(1+.3*np.cos(2*np.pi*3*t)))[:,None],2,axis=1)
    _,stems,_=compose(control)
    bed=sum(stems[name] for name in ('drums','sub','bass','air'))
    output.mkdir(parents=True);(output/'.partial').touch();review=output/'review';review.mkdir()
    blocks=[];key=[]
    for i,row in enumerate(rows):
        source=batch/row['id'];original=read_pcm(source/'source.wav',(.5,5))
        if digest(source/'performance.wav')!=row['audio_sha256']:raise ValueError('Changed candidate')
        candidate=read_pcm(source/'performance.wav',(20,40));plan=json.loads((source/'plan.json').read_text())
        baseline=np.zeros_like(candidate);count=min(len(bed),len(baseline));baseline[:count]=bed[:count]
        for event in plan['events']:
            if event['kind']!='clean_call':continue
            start=event['start_frame'];baseline[start:start+len(original)]+=faded(original,.01)*event['gain']*plan['master_gain']
        baseline*=min(1,.85/max(float(np.max(np.abs(baseline))),1e-9))
        raw=output/(row['id']+'-baseline.wav');write_pcm(raw,baseline)
        folder=review/f'block-{i+1:03d}';folder.mkdir();shutil.copyfile(source/'source.wav',folder/'source.wav')
        choices=[('source_response',source/'performance.wav'),('fixed_bed',raw)];secrets.SystemRandom().shuffle(choices)
        mapping={};hashes={};measurements={}
        for label,(kind,path) in zip(('A','B'),choices):
            gain,measurement=level_match(path,folder/(label+'.wav'),-23,loudness(path))
            mapping[label]=kind;hashes[label]=digest(folder/(label+'.wav'));measurements[label]={'gain_db':gain,**measurement}
        blocks.append({'id':row['id'],'kind':row['kind'],'folder':folder.name,'source_sha256':digest(folder/'source.wav'),'audio_sha256':hashes})
        key.append({'id':row['id'],'mapping':mapping,'levels':measurements})
        print(row['id'],'comparison prepared',flush=True)
    content=json.dumps(blocks,sort_keys=True);freeze=hashlib.sha256(content.encode()).hexdigest()
    data={'freeze':freeze,'blocks':blocks,'listener':'owner','ratings':'NOT RUN','limitations':'One strategy against one fixed bed; not the complete three-strategy M1 study.'}
    (review/'study.json').write_text(json.dumps(data,indent=2)+'\n')
    (output/'organizer-key.json').write_text(json.dumps({'freeze':freeze,'blocks':key},indent=2)+'\n')
    shutil.copyfile(batch/'ATTRIBUTION.txt',review/'ATTRIBUTION.txt')
    (review/'index.html').write_text(HTML)
    (output/'preparation.json').write_text(json.dumps({'technical':'PASS','human_listening':'NOT RUN','blocks':len(blocks),'freeze':freeze,'source_batch_sha256':digest(batch/'report.json'),'script_sha256':digest(Path(__file__)),'scope':data['limitations']},indent=2)+'\n')
    (output/'.partial').unlink()


HTML='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Jamloom · bass comparison</title><style>body{font:17px/1.5 system-ui;max-width:760px;margin:28px auto;padding:0 18px;background:#111b20;color:#eef3ef}section{padding:18px;margin:18px 0;background:#213039;border-radius:12px}audio,select,button{max-width:100%}audio{width:100%}label{display:block;margin:10px 0}select,button{font:inherit;padding:8px;margin:4px}a{color:#b5efac}:focus-visible{outline:3px solid #d7ff80;outline-offset:3px}</style>
<h1>Hear how the sound fits</h1><p>Compare A and B at a comfortable volume. Score only what you hear. You can stop and return; your draft stays in this browser. This compares one new direction with a fixed backing, not the whole product.</p>
<label>Recording <select id="recording"></select></label><p id="progress" role="status"></p><main id="block"></main>
<button id="export" type="button">Download my draft</button><p id="status" role="status"></p><p>No responses are uploaded. <a href="ATTRIBUTION.txt">Recording credits</a></p>
<script>
(async()=>{const data=await(await fetch('study.json')).json(),key='jamloom-bass-review:'+data.freeze;let ratings={};try{const saved=JSON.parse(localStorage.getItem(key)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))ratings=saved}catch{}
const select=document.querySelector('#recording'),container=document.querySelector('#block'),status=document.querySelector('#status');
const metrics=[['recognizable','Original sound recognizable'],['groove','Groove'],['coherence','Music fits together'],['originality','Originality'],['enjoyment','Enjoyment'],['share','Would you share it?']];
function progress(){document.querySelector('#progress').textContent=Object.keys(ratings).length+' of '+data.blocks.length+' recordings have draft responses. These are not submitted ratings.'}
function save(){try{localStorage.setItem(key,JSON.stringify(ratings));status.textContent='Draft saved in this browser.'}catch{status.textContent='Browser storage is unavailable. Download your draft to keep it.'}progress()}
function choice(label,values,current,update){const wrap=document.createElement('label');wrap.append(label+' ');const control=document.createElement('select');control.setAttribute('aria-label',label);for(const [value,text]of [['','Not rated'],...values]){const option=document.createElement('option');option.value=value;option.textContent=text;control.append(option)}control.value=current||'';control.onchange=()=>update(control.value);wrap.append(control);return wrap}
function audio(parent,label,src){const heading=document.createElement('h2');heading.textContent=label;const player=document.createElement('audio');player.controls=true;player.preload='metadata';player.src=src;player.setAttribute('aria-label',label);parent.append(heading,player)}
function show(){document.querySelectorAll('audio').forEach(a=>a.pause());container.replaceChildren();const row=data.blocks[Number(select.value)],base=row.folder+'/';const source=document.createElement('section');audio(source,'Original sound',base+'source.wav');container.append(source);
for(const label of ['A','B']){const section=document.createElement('section');audio(section,'Candidate '+label,base+label+'.wav');for(const [id,title]of metrics){const values=id==='share'?[['yes','Yes'],['no','No']]:id==='recognizable'?[['yes','Yes'],['no','No'],['na','Not applicable']]:[1,2,3,4,5].map(n=>[String(n),String(n)+(n===1?' — poor':n===5?' — excellent':'')]);section.append(choice(label+': '+title,values,ratings[row.id]?.[label]?.[id],value=>{ratings[row.id]??={};ratings[row.id][label]??={};ratings[row.id][label][id]=value;save()}))}container.append(section)}
container.append(choice('Which do you prefer?', [['A','A'],['B','B'],['tie','No preference'],['neither','Neither works']],ratings[row.id]?.preference,value=>{ratings[row.id]??={};ratings[row.id].preference=value;save()}));progress()}
data.blocks.forEach((row,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent='Recording '+(i+1)+' of '+data.blocks.length+' · '+row.kind;select.append(option)});select.onchange=show;show();
document.querySelector('#export').onclick=()=>{const result={version:1,freeze:data.freeze,listener:'owner',status:'draft; requires validation',audio:data.blocks,ratings};const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)+'\\n'],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='jamloom-bass-comparison-'+data.freeze.slice(0,12)+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='Draft downloaded. Nothing was uploaded.'};
document.addEventListener('play',event=>{if(event.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==event.target)a.pause()})},true);document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('audio').forEach(a=>a.pause())});window.addEventListener('pagehide',()=>document.querySelectorAll('audio').forEach(a=>a.pause()));
})().catch(()=>{document.querySelector('#status').textContent='The comparison could not load. Reload the page.'});
</script></html>'''

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--batch',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
    a=p.parse_args();prepare(a.batch,a.output)
