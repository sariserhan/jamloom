"""Offline checks on the retained failed candidate and a previously heard vocal control."""
import hashlib,json,subprocess,sys
from pathlib import Path
import numpy as np
root=Path(__file__).resolve().parents[3];sys.path.insert(0,str(root/'scripts'))
from dj_sung_hooks import splice
p=Path(__file__).parent;case=json.loads((p/'replacement-plan.json').read_text())['cases'][0]
raw=root/'renders/dj-sung-aggressive-20261026-replacement/sung-candidates/raw-0.wav'
base=root/'renders/dj-planner-20261026/house-1.wav'
assert hashlib.sha256(base.read_bytes()).hexdigest()==case['source_sha256']
def decode(path):return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-ar','48000','-ac','2','pipe:1']),dtype='<f4').reshape(-1,2)
a=decode(base);b=decode(raw);start=round(case['cue']['start']*48000);end=start+round(case['cue']['seconds']*48000)
clips=np.flatnonzero(np.max(np.abs(b),axis=1)>=1)
local=b.copy();local[:start]=a[:start];local[end:]=a[end:]
try:splice(a,local,48000,case['cue']);raise AssertionError('The candidate must remain rejected')
except ValueError as error:assert 'drops accompaniment' in str(error)
positive_root=root/'renders/ai-dj-finish-20261024/gpu-launch-fix';positive=next(t for t in json.loads((positive_root/'result.json').read_text())['tracks'] if t['receipt'].get('vocal'))
positive_path=positive_root/f"{positive['session']}-{positive['sequence']}.wav"
assert hashlib.sha256(positive_path.read_bytes()).hexdigest()==positive['sha256']
out=root/'renders/dj-sung-aggressive-20261026-replacement/word-screen';out.mkdir(exist_ok=False)
rows=[]
for name,path,cue in [('candidate',raw,case['cue']),('positive-control',positive_path,positive['receipt']['vocal']),('instrumental-control',base,case['cue'])]:
 excerpt=out/(name+'.wav');report=out/(name+'.json')
 subprocess.run(['ffmpeg','-nostdin','-v','error','-n','-i',str(path),'-ss',str(cue['start']-2),'-t','6','-ar','16000','-ac','1','-c:a','pcm_s16le',str(excerpt)],check=True,timeout=30)
 subprocess.run([str(root/'.venv-speech/bin/python'),str(root/'scripts/analyze_words.py'),'--input',str(excerpt),'--model',str(root/'build-speech-tools/faster-whisper-tiny'),'--output',str(report),'--synthetic-fixture','--understand'],check=True,timeout=120,cwd=root)
 r=json.loads(report.read_text());assert r['source_sha256']==hashlib.sha256(excerpt.read_bytes()).hexdigest()
 rows.append(dict(name=name,source_sha256=hashlib.sha256(path.read_bytes()).hexdigest(),excerpt_sha256=r['source_sha256'],transcript=r['transcript'],phrases=r['phrases']))
result=dict(status='FAIL candidate continuity; ASR screening only',raw_sha256=hashlib.sha256(raw.read_bytes()).hexdigest(),clipped_frames=len(clips),clipped_seconds=[float(i/48000) for i in clips],clipped_frames_inside_edit=int(np.sum((clips>=start)&(clips<end))),source_safe_outside_edit_still_fails='Repaint drops accompaniment for at least 200 ms',asr=rows,human_listening='NOT RUN for new candidate',limits='The temporary array substitutes the original outside the edit only to diagnose validation; no repaired audio is saved or approved. Transcription does not prove naturalness.')
(p/'retained-analysis.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
