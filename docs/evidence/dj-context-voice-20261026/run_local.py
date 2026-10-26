"""One bounded offline musical-context diagnostic through the existing singer pipeline."""
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time
import psutil

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'scripts'))
from singing_response import CODE_REVISION, WEIGHT_REVISION, validate_plan

evidence = Path(__file__).parent
output = ROOT / 'renders/dj-context-voice-20261026'
assert not output.exists(), 'Preserve previous output'
assert psutil.virtual_memory().available >= 4*1024**3, 'Hold: fewer than 4 GiB available'
assert __name__ == '__main__' and sys.argv[1:] == []
plan = validate_plan(dict(schema='jamloom-sung-response-1', model_code=CODE_REVISION, weights=WEIGHT_REVISION,
    phrase='Original short club vocal phrases; musical-context diagnostic, not a finished DJ track.',
    cases=[dict(id='house-male', genre='house', voice='male', vocal_profile='male-tenor', seed=501026,
                bpm=124, duration=30, source_repetitions=1, vocal_language='en',
                lyrics='[Chorus]\nFeel alive\nWe rise\nStay close\nAll night')]))
(evidence / 'plan.json').write_text(json.dumps(plan, indent=2) + '\n')
command = [str(ROOT / '.venv-singer/bin/python'), str(ROOT / 'scripts/singing_response.py'), 'sing',
           '--runtime', str(ROOT / 'build-style-training/upstream'), '--plan', str(evidence / 'plan.json'),
           '--output', str(output), '--case', 'house-male']
result = dict(status='FAIL', command=command, initial_available_bytes=psutil.virtual_memory().available,
              peak_process_group_rss_bytes=0, memory_floor_bytes=512*1024**2,
              timeout_seconds=300, paid_compute=False, attempts=1, human_listening='NOT RUN')
started = time.monotonic()
process = None
try:
    with (evidence / 'execution.log').open('w') as log:
        process = subprocess.Popen(command, cwd=ROOT, stdout=log, stderr=subprocess.STDOUT, start_new_session=True,
            env={**os.environ, 'HF_HUB_OFFLINE':'1', 'TRANSFORMERS_OFFLINE':'1', 'HF_HUB_DISABLE_TELEMETRY':'1',
                 'JAMLOOM_INFERENCE_DEVICE':'mps', 'JAMLOOM_VOCAL_IDENTITY_ENABLED':'false'})
        while process.poll() is None:
            rows = subprocess.check_output(['ps', '-axo', 'pgid=,rss='], text=True)
            rss = sum(int(row.split()[1])*1024 for row in rows.splitlines() if int(row.split()[0]) == process.pid)
            result['peak_process_group_rss_bytes'] = max(rss, result['peak_process_group_rss_bytes'])
            if psutil.virtual_memory().available < result['memory_floor_bytes']: raise RuntimeError('Memory floor reached')
            if rss > 8*1024**3: raise RuntimeError('Process RSS limit reached')
            if time.monotonic() - started > 300: raise TimeoutError('Local time bound reached')
            time.sleep(2)
        if process.returncode: raise RuntimeError('Singer failed; retain execution.log')
        receipt = json.loads((output / 'complete.json').read_text())
        assert receipt['audio_sha256'] == hashlib.sha256((output / 'singer.wav').read_bytes()).hexdigest()
        assert receipt['case'] == plan['cases'][0] and receipt['source_conditioning'] is None
        assert receipt['vocal_reference'] is None and receipt['trained_adapter'] is False
        (evidence / 'complete.json').write_bytes((output / 'complete.json').read_bytes())
        result['status'] = 'PASS local generation only; listening NOT RUN'
except Exception as error:
    result['error'] = str(error)
    raise
finally:
    if process is not None:
        try: os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError: pass
        process.wait()
    result['seconds'] = time.monotonic() - started
    (evidence / 'execution.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))
