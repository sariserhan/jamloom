#!/usr/bin/env python3
"""Verify the approved MIDI-only archive and report coverage, without rendering its audio."""
import argparse
from collections import Counter
import csv
import hashlib
import io
import json
from pathlib import Path
import urllib.request
import zipfile

URL='https://storage.googleapis.com/magentadata/datasets/groove/groove-v1.0.0-midionly.zip'
SHA='651cbc524ffb891be1a3e46d89dc82a1cecb09a57c748c7b45b844c4841dcc1e'


def main():
    import mido
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    if args.output.exists(): raise ValueError('Preserve previous audit')
    with urllib.request.urlopen(URL,timeout=40) as response: data=response.read(4*1024*1024+1)
    if len(data)>4*1024*1024 or hashlib.sha256(data).hexdigest()!=SHA: raise ValueError('Archive changed')
    notes=Counter();styles=Counter();drummers=Counter();sessions={};hashes={};files=0
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        if sum(i.file_size for i in archive.infolist())>30*1024*1024: raise ValueError('Unexpected expanded size')
        metadata=archive.read('groove/info.csv').decode()
        for row in csv.DictReader(io.StringIO(metadata)):
            name='groove/'+row['midi_filename']; path=Path(name)
            if path.is_absolute() or '..' in path.parts or path.suffix!='.mid': raise ValueError('Invalid MIDI path')
            raw=archive.read(name)
            if len(raw)>1024*1024: raise ValueError('Oversized performance')
            midi=mido.MidiFile(file=io.BytesIO(raw))
            if midi.type not in (0,1) or midi.ticks_per_beat<=0: raise ValueError('Unsupported MIDI')
            for track in midi.tracks:
                for msg in track:
                    if msg.time<0: raise ValueError('Invalid MIDI timing')
                    if msg.type=='note_on' and msg.velocity>0: notes[msg.note]+=1
            hashes[row['midi_filename']]=hashlib.sha256(raw).hexdigest()
            files+=1;styles[row['style']]+=1;drummers[row['drummer']]+=1
            sessions.setdefault(row['session'],set()).add(row['split'])
    result={'status':'PASS','publisher':URL,'version':'1.0.0','archive_sha256':SHA,
            'license':'CC BY 4.0; Google LLC; Gillick et al. 2019; MIDI/metadata only',
            'files':files,'drummers':dict(drummers),'styles':dict(styles),'notes_by_pitch':dict(notes),
            'sessions_crossing_publisher_splits':sorted(k for k,v in sessions.items() if len(v)>1),
            'midi_hashes':hashes,'download_bytes':len(data),'audio_downloaded':False,'training':'NOT RUN',
            'limitations':['Only seven dance-labeled performances; not a full house/tech-house/techno corpus',
                           'Publisher splits can share performers/sessions; use group splits before training',
                           'Timing and velocity observations are not DJ decisions or audio-quality ratings']}
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({k:result[k] for k in ['status','files','download_bytes','sessions_crossing_publisher_splits']}))


if __name__=='__main__':main()
