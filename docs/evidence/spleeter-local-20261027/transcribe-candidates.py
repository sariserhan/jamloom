import os,json,hashlib,time,sys
from pathlib import Path
root=Path('/Users/serhansari/Documents/projects/jamloom');os.chdir(root)
os.environ.update(HF_HUB_OFFLINE='1',TOKENIZERS_PARALLELISM='false')
import numpy as np
import subprocess
from faster_whisper import WhisperModel
manifest=json.loads(Path('assets/manifests/word-timing-tiny.json').read_text());model=Path('build-speech-tools/faster-whisper-tiny')
for name,item in manifest['files'].items():assert hashlib.sha256((model/name).read_bytes()).hexdigest()==item['sha256']
engine=WhisperModel(str(model.resolve()),device='cpu',compute_type='int8',cpu_threads=4,num_workers=1,local_files_only=True)
out=Path('docs/evidence/spleeter-local-20261027/targets');out.mkdir(parents=True,exist_ok=True)
for case in ['deep-house-male','eurodance-female']:
 target=out/f'{case}-words.json';assert not target.exists()
 source=Path(f'renders/spleeter-local-20261027/{case}/vocals.npy');data=np.load(source,allow_pickle=False);assert data.shape==(5760000,2) and np.isfinite(data).all()
 raw=subprocess.run(['ffmpeg','-v','error','-f','f32le','-ar','48000','-ac','1','-i','pipe:0','-ar','16000','-f','f32le','pipe:1'],input=data.mean(axis=1).astype('<f4').tobytes(),capture_output=True,check=True,timeout=30).stdout;audio=np.frombuffer(raw,dtype='<f4');started=time.monotonic()
 segments,info=engine.transcribe(audio,language='en',word_timestamps=True,beam_size=5,best_of=1,temperature=0,condition_on_previous_text=False,vad_filter=False,repetition_penalty=1.1,no_repeat_ngram_size=4)
 rows=[]
 for s in segments:
  rows.append({'at':s.start,'end':s.end,'text':s.text,'no_speech':s.no_speech_prob,'log_probability':s.avg_logprob,'words':[{'text':w.word,'at':w.start,'end':w.end,'probability':w.probability} for w in s.words or []]});print(case,s.start,s.text,flush=True)
 target.write_text(json.dumps({'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'seconds':time.monotonic()-started,'segments':rows,'qualification':'Automatic candidate only'},indent=2)+'\n')
