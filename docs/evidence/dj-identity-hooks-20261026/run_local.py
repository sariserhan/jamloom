"""One offline conversion of the rejected original; no generation, rental or upload."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'renders/dj-identity-hooks-20261026'
RAW = ROOT / 'renders/dj-isolated-hooks-20261026/sung-candidates/raw-0.wav'
DIGEST = 'd00b88f70549bbe9dde11f98d5016939f5a463b5d873affc9b6ed0e37b6fd71f'

if len(sys.argv) == 2 and sys.argv[1] == '--child':
    sys.path.insert(0, str(ROOT / 'scripts'))
    from vocal_identity import finish_identity
    finish_identity(OUT)
else:
    assert sys.argv[1:] == []
    assert hashlib.sha256(RAW.read_bytes()).hexdigest() == DIGEST
    OUT.mkdir(exist_ok=False)
    shutil.copyfile(RAW, OUT / 'singer.wav')
    receipt = dict(case=dict(voice='male', duration=10, seed=501026, vocal_identity='am_michael'),
                   source_conditioning=None, audio_sha256=DIGEST,
                   source_status='Owner rejected: Singing, but unnatural or unclear',
                   method='Retained original voice conversion, not fresh singing or model training')
    (OUT / 'complete.json').write_text(json.dumps(receipt, indent=2) + '\n')
    started = time.monotonic()
    process = None
    result = dict(status='FAIL', paid_compute=False, downloads=False, timeout_seconds=900,
                  max_process_group_rss_bytes=7*1024**3, peak_process_group_rss_bytes=0)
    try:
        with (OUT / 'conversion.log').open('w') as log:
            process = subprocess.Popen([str(ROOT / '.venv-singer/bin/python'), str(Path(__file__).resolve()), '--child'],
                cwd=ROOT, stdout=log, stderr=subprocess.STDOUT, start_new_session=True,
                env={**os.environ, 'HF_HUB_OFFLINE':'1', 'TRANSFORMERS_OFFLINE':'1', 'HF_HUB_DISABLE_TELEMETRY':'1'})
            while process.poll() is None:
                rows = subprocess.check_output(['ps', '-axo', 'pgid=,rss='], text=True)
                rss = sum(int(row.split()[1])*1024 for row in rows.splitlines() if int(row.split()[0]) == process.pid)
                result['peak_process_group_rss_bytes'] = max(rss, result['peak_process_group_rss_bytes'])
                if rss > result['max_process_group_rss_bytes']: raise RuntimeError('Local memory bound exceeded')
                if time.monotonic() - started > 900: raise TimeoutError('Local conversion time bound exceeded')
                time.sleep(2)
            if process.returncode: raise RuntimeError('Local conversion failed; preserve conversion.log')
            assert hashlib.sha256(RAW.read_bytes()).hexdigest() == DIGEST
            assert (OUT / 'singer.wav').is_file() and not (OUT / '.partial').exists()
            result['status'] = 'PASS local execution only; listening NOT RUN'
    except Exception as error:
        result['error'] = str(error)
        raise
    finally:
        if process is not None:
            try: os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError: pass
            process.wait()
        result['seconds'] = time.monotonic() - started
        (OUT / 'execution.json').write_text(json.dumps(result, indent=2) + '\n')
        print(json.dumps(result, indent=2))
