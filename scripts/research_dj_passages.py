#!/usr/bin/env python3
"""Use the existing pinned CLAP auditor on declared passages; scores are uncalibrated research evidence."""
import argparse
import json
from pathlib import Path
import resource
import subprocess
import time
import numpy as np
from analyze_dj_references import digest
from check_dna_audio import load_auditor, MANIFEST

ROOT=Path(__file__).resolve().parents[1]
CAPTIONS={
 'style':{'house':'House music with a steady four-on-the-floor electronic dance groove.','bass':'Dubstep music with half-time drums and heavy wobbling bass.','breakbeat':'Drum and bass music with rapid breakbeats.','techno':'Driving techno music with a repetitive electronic pulse.','hip-hop':'Hip-hop music with a swinging drum beat.','chill':'Mellow downtempo electronic music.'},
 'sound':{'modulated-bass':'Electronic music with gritty distorted growling and wobbling bass sounds.','smooth-bass':'Electronic music with smooth sustained low bass tones.','synth-hook':'Electronic music with a bright repeated lead synthesizer melody.','chord-stabs':'Electronic music with short rhythmic synthesizer chord stabs.','pads':'Electronic music with long atmospheric synthesizer pads.','percussion':'Electronic music dominated by drums and percussion.','acoustic':'Music with acoustic instruments and piano.','guitar':'Music with prominent electric guitar.'},
 'voice':{'instrumental':'Instrumental music without any voice.','singing':'Music with a person singing a melody.','rapping':'Music with rhythmic rap vocals.','speech':'Music with a person speaking over it.','crowd':'Music with a crowd cheering and shouting.'},
 'section':{'full-groove':'Dance music with a full energetic drum and bass groove.','breakdown':'A quiet atmospheric musical breakdown without a strong drum beat.','build':'Dance music building tension with a rising sound and a drum roll.','drop':'An explosive bass drop in electronic dance music.'}}


def passages(row):
    duration=row['duration_seconds']
    if duration<10:raise ValueError('Ten-second passage required')
    if row['kind']=='generated':
        if duration!=60:raise ValueError('Expected rated 60-second original')
        return [{'start':t,'selection':'uniform'}for t in [0,15,30,45,50]]
    end=max(0,min(duration,row['decoded_seconds'])-10-.25)
    result=[{'start':round(min(end,t),3),'selection':'uniform'}for t in [0,duration*.25,duration*.5,duration*.75,duration-10]]
    analysis=json.loads((ROOT/'renders/dj-reference-analysis-20261025'/(row['id']+'.json')).read_text())
    candidates=sorted(analysis['candidate_changes'],key=lambda r:-(abs(r['energy_delta_db'])/3+r['texture_delta']/.18))
    for c in candidates:
        t=round(max(0,min(end,c['seconds']-5)),3)
        if all(abs(t-r['start'])>=30 for r in result):result.append({'start':t,'selection':'unreviewed_energy_texture_change'})
        if len(result)==8:break
    return sorted(result,key=lambda r:r['start'])


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);args=p.parse_args()
    args.output.mkdir(parents=True,exist_ok=False);began=time.monotonic()
    base=ROOT/'renders/dj-sound-comparison-20261025'
    summary=json.loads((base/'report.json').read_text())
    rows=[json.loads((base/(r['id']+'.json')).read_text())for r in summary['files']]
    plan={'captions':CAPTIONS,'model_revision':MANIFEST['revision'],'files':[{'id':r['id'],'sha256':r['sha256'],'passages':passages(r)}for r in rows]}
    (args.output/'plan.json').write_text(json.dumps(plan,indent=2)+'\n')
    processor,model=load_auditor()
    import torch
    torch.set_num_threads(2);torch.manual_seed(0);np.random.seed(0)
    labels=[(group,label,text)for group,values in CAPTIONS.items()for label,text in values.items()]
    texts=[r[2]for r in labels];files=[]
    with torch.inference_mode():
        for row,declared in zip(rows,plan['files']):
            path=Path(row['path'])
            if digest(path)!=row['sha256']:raise ValueError('Source changed')
            results=[]
            for passage in declared['passages']:
                data=subprocess.check_output(['ffmpeg','-nostdin','-v','error','-threads','1','-ss',str(passage['start']),'-i',str(path),'-t','10','-map','0:a:0','-ac','1','-ar','48000','-f','f32le','pipe:1'],timeout=30)
                pcm=np.frombuffer(data,dtype='<f4').copy()
                if pcm.shape!=(480000,) or not np.isfinite(pcm).all():raise ValueError('Incomplete passage')
                inputs=processor(text=texts,audio=[pcm],return_tensors='pt',padding=True,sampling_rate=48000)
                value=model(**inputs);scores=(value.audio_embeds@value.text_embeds.T)[0].tolist()
                groups={group:sorted([{'label':label,'cosine':score}for (g,label,_),score in zip(labels,scores)if g==group],key=lambda r:-r['cosine'])for group in CAPTIONS}
                results.append({**passage,'seconds':10,'rankings':groups,'reviewed':False})
                if resource.getrusage(resource.RUSAGE_SELF).ru_maxrss>2_500_000_000:raise RuntimeError('Local analysis exceeded 2.5 GB peak memory limit')
            if digest(path)!=row['sha256']:raise ValueError('Source changed during review')
            result={'id':row['id'],'sha256':row['sha256'],'kind':row['kind'],'style':row['style'],'passages':results}
            (args.output/(row['id']+'.json')).write_text(json.dumps(result,indent=2,allow_nan=False)+'\n');files.append(result);print(row['id'],len(results),'passages analyzed',flush=True)
    report={'status':'PASS sampled semantic analysis','elapsed_seconds':time.monotonic()-began,'peak_memory_bytes':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,'model_revision':MANIFEST['revision'],'script_sha256':digest(Path(__file__)),'files':files,
        'limits':['CLAP cosine rankings are uncalibrated similarities, not probabilities, quality scores or verified instrument/vocal/section labels.','Only declared ten-second passages received semantic analysis; full-file DSP is separate.','Purposefully sampled changes bias coverage; do not interpret tag counts as full-recording prevalence.','No listening, training, reference-audio copies, uploads or production model changes.','Crowd, codec, mastering, overlapping sounds and caption phrasing can affect rankings. Exact melodies, chords, lyrics, DJ actions and artistic quality remain unverified.']}
    (args.output/'report.json').write_text(json.dumps(report,indent=2,allow_nan=False)+'\n');print('PASS sampled semantic analysis',round(report['elapsed_seconds'],1),'seconds',flush=True)


if __name__=='__main__':main()
