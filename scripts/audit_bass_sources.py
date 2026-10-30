#!/usr/bin/env python3
"""Audit one bass strategy across retained licensed inputs; never create ratings."""
import argparse
import json
from pathlib import Path
import subprocess
import time
import wave

import numpy as np
from arrange_voice_research import RATE, digest, read_pcm
from source_bass_response import render
from source_led_response import faded


def pcm(path):
    with wave.open(str(path),'rb') as audio:
        assert audio.getparams()[:3]==(2,2,RATE) and audio.getcomptype()=='NONE'
        frames=audio.getnframes();raw=audio.readframes(frames)
        assert len(raw)==frames*4
    return np.frombuffer(raw,dtype='<i2').reshape(-1,2).astype(np.float64)/32768


def audit(ledger,output):
    if output.exists():raise FileExistsError('Preserve prior evaluations')
    frozen=json.loads(ledger.read_text());rows=frozen['dataset']['clips']
    if not rows or len(rows)>50:raise ValueError('Expected a bounded frozen dataset')
    ids=[r['id'] for r in rows]
    if len(set(ids))!=len(ids) or any(not name or any(c not in 'abcdefghijklmnopqrstuvwxyz0123456789-' for c in name) for name in ids):
        raise ValueError('Invalid source identifiers')
    for row in rows:
        synthetic_silence=row['kind']=='silence' and row['source_kind']=='synthetic'
        if (row['consent']['local_processing'] is not True or (not synthetic_silence and row['license']['id'] not in ('CC-BY-4.0','CC0-1.0','PD-author'))
                or digest(Path(row['path']))!=row['sha256']):
            raise ValueError('Missing source permission or changed file: '+row['id'])
    output.mkdir(parents=True);(output/'.partial').touch()
    (output/'inputs').mkdir()
    (output/'ATTRIBUTION.txt').write_text('\n\n'.join(r.get('license',{}).get('attribution',r['consent']['evidence']) for r in rows)+'\n')
    report={'technical':'RUNNING','musical_quality':'NOT RUN','training':'NOT RUN','strategy_count':1,'seed':103031,
        'ledger_sha256':digest(ledger),'renderer_sha256':digest(Path(__file__).with_name('source_bass_response.py')),
        'source_count':len(rows),'records':[],'scope':'Technical generalization only. One authored bass strategy; not the required three distinct strategies, blinded comparison or broad musical acceptance.'}
    started=time.monotonic()
    for row in rows:
        original_source=Path(row['path']);source=output/'inputs'/(row['id']+'.wav');folder=output/row['id']
        subprocess.run(['ffmpeg','-nostdin','-v','error','-n','-i',str(original_source),
                        '-ar',str(RATE),'-ac','2','-c:a','pcm_s16le',str(source)],check=True,timeout=30)
        if row['kind']=='silence':
            try:render(source,folder,True)
            except ValueError as error:
                if 'sil' not in str(error).lower() and 'audible' not in str(error).lower():raise
                if folder.exists():raise ValueError('Silence produced output')
                report['records'].append({'id':row['id'],'kind':row['kind'],'status':'PASS expected rejection','source_sha256':row['sha256'],'recorded':False})
            else:raise ValueError('Silence accepted')
        else:
            render(source,folder,True)
            complete=json.loads((folder/'complete.json').read_text());plan=json.loads((folder/'plan.json').read_text())
            mix=pcm(folder/'performance.wav');stems={name:pcm(folder/(name+'.wav')) for name in ('drums','sub','bass','voice','air')}
            assert 20<=len(mix)/RATE<=40 and np.isfinite(mix).all() and np.max(np.abs(mix))<=.851
            error=float(np.max(np.abs(sum(stems.values())-mix)));assert error<=6/32768
            assert np.max(np.abs(mix[-RATE//10:]))==0
            original=read_pcm(source,(.5,5.))
            clean=[e for e in plan['events'] if e['kind']=='clean_call'];assert len(clean)==3
            for event in clean:
                start=event['start_frame'];expected=faded(original,.01)*event['gain']*plan['master_gain']
                assert np.max(np.abs(stems['voice'][start:start+len(original)]-expected))<=1/32768
            assert all(digest(folder/name)==value for name,value in complete['artifacts'].items())
            report['records'].append({'id':row['id'],'kind':row['kind'],'status':'PASS technical','source_sha256':row['sha256'],
                'source_seconds':len(original)/RATE,'output_seconds':len(mix)/RATE,'peak':float(np.max(np.abs(mix))),
                'stem_sum_error':error,'clean_calls_verified':len(clean),'audio_sha256':digest(folder/'performance.wav'),
                'owner_listening':'NOT RUN','recorded':row['source_kind']=='recorded'})
        report['records'][-1]['prepared_input_sha256']=digest(source)
        report['records'][-1]['preparation']='Full original resampled to 48 kHz stereo PCM16; no crop; original unchanged'
        assert digest(original_source)==row['sha256']
        print(row['id'],report['records'][-1]['status'],flush=True)
        (output/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    report.update(technical='PASS',seconds=round(time.monotonic()-started,2),
        recorded_sources=sum(r['recorded'] for r in report['records']),
        missing=['Recorded silence control','Three distinct strategies per input','Blinded owner comparison and ratings'])
    (output/'report.json').write_text(json.dumps(report,indent=2)+'\n');(output/'.partial').unlink()
    return report


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--ledger',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
    args=p.parse_args();audit(args.ledger,args.output)
