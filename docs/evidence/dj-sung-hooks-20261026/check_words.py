"""Secondary offline transcript screening with unchanged instrumental controls; never musical acceptance."""
import hashlib
import json
from pathlib import Path
import subprocess

root=Path.cwd();evidence=root/'docs/evidence/dj-sung-hooks-20261026';source=root/'renders/dj-sung-hooks-20261026-replacement'
run=json.loads((source/'report.json').read_text());assert run['status']=='PASS technical'
plan=json.loads((evidence/'gpu-plan.json').read_text());output=source/'word-screen';output.mkdir(exist_ok=False)
rows=[]
cases=[(f'candidate-{i}',source/'sung-candidates'/f'raw-{i}.wav',case,run['tracks'][i]['receipt']['musical_hook']['raw_sha256'])for i,case in enumerate(plan['cases'])]
cases += [(f'control-{i}',root/'renders/dj-planner-20261026'/plan['cases'][i]['source_file'].removeprefix('sung-'),plan['cases'][i],plan['cases'][i]['source_sha256'])for i in [0,2]]
for name,path,case,expected in cases:
    assert hashlib.sha256(path.read_bytes()).hexdigest()==expected
    clip=output/(name+'.wav');report=output/(name+'.json');start=case['cue']['start']-2
    subprocess.run(['ffmpeg','-nostdin','-v','error','-n','-i',str(path),'-ss',str(start),'-t','6','-ar','16000','-ac','1','-c:a','pcm_s16le',str(clip)],check=True,timeout=30)
    subprocess.run([str(root/'.venv-speech/bin/python'),'scripts/analyze_words.py','--input',str(clip),'--model','build-speech-tools/faster-whisper-tiny','--output',str(report),'--synthetic-fixture','--understand'],check=True,timeout=120)
    result=json.loads(report.read_text());assert result['source_sha256']==hashlib.sha256(clip.read_bytes()).hexdigest()
    rows.append(dict(name=name,source_sha256=expected,excerpt_start=start,expected_phrase=case['phrase'],transcript=result['transcript'],phrases=result['phrases'],model_manifest_sha256=result.get('model_manifest_sha256'),human_verified=False))
controls=[r for r in rows if r['name'].startswith('control')]
result=dict(status='PASS execution only',controls_transcribed_any_words=any(r['transcript'] for r in controls),rows=rows,
    limits=['Tiny speech recognition is not a singing or naturalness evaluator.','No expected lyric was supplied to the recognizer.','A nonempty instrumental control invalidates voice-presence inference from this screening.','Word and musical acceptance still require listening.'])
(evidence/'word-screen.json').write_text(json.dumps(result,indent=2)+'\n')
