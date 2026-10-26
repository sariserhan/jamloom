"""Free real-time rehearsal: reuse twelve verified masters, start at two, release later ones on a 30s cadence."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--stress', action='store_true', help='Deliver retained originals later, on a forty-second cadence')
args=parser.parse_args()
source=ROOT/'renders/dj-flow-qualification-20261026'
output=ROOT/('renders/dj-flow-stress-v2-20261026' if args.stress else 'renders/dj-flow-buffer-replay-20261026')
mix=ROOT/('renders/dj-flow-stress-mix-v2-20261026' if args.stress else 'renders/dj-flow-buffer-replay-mix-20261026')
report=json.loads((source/'report.json').read_text())
assert report['cleanup_confirmed'] and len(report['tracks'])==12
output.mkdir()
ready={'status':'LOCAL REPLAY; no fresh generation','tracks':[]}
def publish(index):
    row=report['tracks'][index];original=source/row['file'];assert original.name==f'house-{index}.wav'
    assert hashlib.sha256(original.read_bytes()).hexdigest()==row['receipt']['sha256']
    os.link(original,output/original.name)
    ready['tracks'].append({**row,'ready_at_ms':int(time.time()*1000)})
    temporary=output/'ready.tmp';temporary.write_text(json.dumps(ready));temporary.replace(output/'ready.json')
    print('Retained fixture ready:',index+1,flush=True)
publish(0);publish(1)
with (output/'playback.log').open('wb') as log:
    player=subprocess.Popen(['node','tests/dj-mix-comparison.mjs','--flow-fixture'],cwd=ROOT/'apps/site',stdout=log,stderr=subprocess.STDOUT,env={**os.environ,'JAMLOOM_FLOW_SOURCE':str(output),'JAMLOOM_FLOW_OUTPUT':str(mix)})
try:
    deadline=time.monotonic()+45
    while not (output/'playback-started.json').exists():
        assert player.poll() is None and time.monotonic()<deadline,'Player startup failed'
        time.sleep(.1)
    proof=json.loads((output/'playback-started.json').read_text());assert proof['available_tracks']==2 and proof['history']==['0']
    began=time.monotonic()
    for index in range(2,12):
        scheduled=began+(index-2)*(40 if args.stress else 30)+(58 if args.stress else 28)
        while time.monotonic()<scheduled:
            assert player.poll() is None,'Player stopped before all deliveries'
            time.sleep(min(.25,max(0,scheduled-time.monotonic())))
        publish(index)
    assert player.wait(timeout=max(1,850-(time.monotonic()-began)))==0,'Real mixer replay failed'
    result=json.loads((mix/'report.json').read_text())
    assert result['status']=='PASS technical' and not result['newGeneration'] and result['retainedFixture']
    print('PASS real-time retained replay; fresh GPU capacity NOT RUN',flush=True)
finally:
    if player.poll() is None:
        player.terminate()
        try:player.wait(timeout=5)
        except subprocess.TimeoutExpired:player.kill();player.wait()
