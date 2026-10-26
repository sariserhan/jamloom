"""Free fault injection: two short retained clips, then no third delivery; playback must fail promptly."""
import hashlib
import json
from pathlib import Path
import subprocess
import time
ROOT=Path(__file__).resolve().parents[1]
site=ROOT/'apps/site';source=ROOT/'renders/dj-flow-qualification-20261026'
folder=ROOT/'renders/dj-flow-buffer-failure-20261026';folder.mkdir()
rows=json.loads((source/'report.json').read_text())['tracks'][:2]
for row in rows:
    original=source/row['file'];assert hashlib.sha256(original.read_bytes()).hexdigest()==row['receipt']['sha256']
    target=folder/row['file'];subprocess.run(['ffmpeg','-v','error','-i',str(original),'-t','8','-c:a','pcm_s16le',str(target)],check=True)
    row['receipt']['sha256']=hashlib.sha256(target.read_bytes()).hexdigest()
(folder/'ready.json').write_text(json.dumps({'tracks':rows,'scope':'Fault injection, truncated retained audio; not generation or musical evidence'}))
temporary=site/'tests/.dj-flow-failure.mjs'
code=(site/'tests/dj-mix-comparison.mjs').read_text().replace('renders/dj-flow-buffer-replay-20261026','renders/dj-flow-buffer-failure-20261026').replace('renders/dj-flow-buffer-replay-mix-20261026','renders/dj-flow-buffer-failure-mix-20261026')
with temporary.open('x') as file:file.write(code)
began=time.monotonic()
try:
    result=subprocess.run(['node',str(temporary),'--flow-fixture'],cwd=site,capture_output=True,text=True,timeout=50)
    elapsed=time.monotonic()-began
    assert result.returncode!=0 and 'Fresh playback stopped before all tracks' in result.stderr and elapsed<45,(result.returncode,elapsed,result.stderr[-1000:])
    proof={'status':'PASS fail-fast injection','seconds':elapsed,'failure':'Missing third delivery detected and mixer capture rejected','paid_compute':False,'reused_truncated_audio':True}
    (ROOT/'docs/evidence/dj-flow-buffer-20261026/failure-check.json').write_text(json.dumps(proof,indent=2)+'\n')
    print(json.dumps(proof))
finally:temporary.unlink()
