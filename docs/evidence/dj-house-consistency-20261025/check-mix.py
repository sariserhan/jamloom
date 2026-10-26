import json,subprocess,numpy as np
from scipy.signal import correlate
from pathlib import Path
root=Path.cwd(); out=root/'docs/evidence/dj-house-consistency-20261025'
def pcm(path):return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-ac','1','-ar','8000','-f','f32le','-']),dtype='<f4')
m=pcm('renders/dj-house-mix-20261025/after.webm');s=pcm('renders/ai-dj-finish-20261024/gpu-launch-fix/f6a7a2a8a29c408cac5b1e4b59ed2604-2.wav')
# Locate the same source waveform after the transition has completed.
a=m[109*8000:125*8000];b=s[8*8000:12*8000];corr=correlate(a,b,mode='valid',method='fft');lag=int(np.argmax(corr));offset=109+lag/8000-8
aligned=a[lag:lag+len(b)];match=float(np.corrcoef(aligned,b)[0,1]);gain=float(np.dot(aligned,b)/np.dot(b,b))
intervals=[(110.45325,110.707229),(112.298333,112.551146)]
report={'status':'PARTIAL musical continuity','source_alignment_seconds':offset,'source_waveform_correlation':match,'source_to_capture_gain':gain,'quiet_intervals':[{'mix_start':x,'mix_end':y,'source_start':x-offset,'source_end':y-offset}for x,y in intervals],'threshold_db':-60,'minimum_quiet_seconds':.25,'interpretation':'Two brief quiet intervals occur after the third-track handoff. The aligned source contains the same quiet intervals; attenuation brings them under the capture threshold. No network or decoder dropout established. Human listening remains required.'}
assert match>.95
(out/'mix-continuity.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
