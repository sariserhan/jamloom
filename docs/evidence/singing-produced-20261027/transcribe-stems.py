import os,sys,json,hashlib,time
from pathlib import Path
os.environ.update(HF_HUB_OFFLINE='1',TRANSFORMERS_OFFLINE='1',TOKENIZERS_PARALLELISM='false')
root=Path('/Users/serhansari/Documents/projects/jamloom');os.chdir(root)
import numpy as np,torch,torchaudio,psutil
from transformers import WhisperTokenizerFast,WhisperFeatureExtractor,WhisperForConditionalGeneration
assert psutil.virtual_memory().available>3*2**30
modeldir=root/'build-style-training/vocal-identity/openai--whisper-small'
manifest=json.load(open('assets/manifests/vocal-identity-models.json'))['openai/whisper-small']
for name,item in manifest['files'].items():assert hashlib.sha256((modeldir/name).read_bytes()).hexdigest()==item['sha256']
tokenizer=WhisperTokenizerFast(tokenizer_file='build-speech-tools/faster-whisper-tiny/tokenizer.json',language='en',task='transcribe')
tokenizer.add_tokens([f'<|{i*.02:.2f}|>' for i in range(1501)],special_tokens=True)
assert len(tokenizer)==51865
extractor=WhisperFeatureExtractor.from_pretrained(modeldir,local_files_only=True)
model=WhisperForConditionalGeneration.from_pretrained(modeldir,local_files_only=True).to('mps').eval()
model.generation_config.no_timestamps_token_id=50363
model.generation_config.is_multilingual=True
model.generation_config.lang_to_id={'<|en|>':50259}
model.generation_config.task_to_id={'transcribe':50359}
torch.set_num_threads(4)
for case in ['deep-house-male','eurodance-female']:
 started=time.monotonic();stem=root/f'renders/singing-originals-20261027/{case}/stems/vocals.npy'
 data=np.load(stem,mmap_mode='r');audio=torchaudio.functional.resample(torch.from_numpy(data.mean(axis=1).copy()),48000,16000).numpy();segments=[]
 for at in range(0,120,20):
  assert psutil.virtual_memory().available>512*2**20
  features=extractor(audio[at*16000:(at+20)*16000],sampling_rate=16000,return_tensors='pt').input_features.to('mps')
  with torch.inference_mode():tokens=model.generate(features,language='en',task='transcribe',return_timestamps=False,max_new_tokens=256,do_sample=False)
  text=tokenizer.batch_decode(tokens,skip_special_tokens=True)[0];segments.append({'at':at,'text':text});print(case,at,text,flush=True)
 out={'source_stem_sha256':hashlib.sha256(stem.read_bytes()).hexdigest(),'model_revision':manifest['revision'],'seconds':time.monotonic()-started,'segments':segments,'status':'Automatic transcription candidate; not verified lyrics or timing'}
 dest=root/f'docs/evidence/singing-originals-20261027/{case}-small-stem-transcript.json'
 with dest.open('x') as f:json.dump(out,f,indent=2)
