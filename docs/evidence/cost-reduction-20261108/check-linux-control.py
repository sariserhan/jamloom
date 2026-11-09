"""Two real-process checks on the existing guardian host, in a disposable directory.

Only public Python source travels over SSH. No packages, models, services or GPU
are installed or changed. This is not a full Linux image or audio qualification.
"""
import hashlib
import json
from pathlib import Path
import subprocess

ROOT=Path(__file__).resolve().parents[3]
names=('scripts/generation_timing.py','scripts/vocal_identity.py','tests/test_identity_preload.py')
files={name:(ROOT/name).read_text() for name in names}
remote='''import json,pathlib,platform,subprocess,sys,tempfile
files=json.load(sys.stdin)
with tempfile.TemporaryDirectory(prefix='jamloom-preload-control-') as directory:
 root=pathlib.Path(directory)
 for name,text in files.items():
  path=root/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text)
 (root/'tests/__init__.py').touch()
 result=subprocess.run([sys.executable,'-m','unittest',
  'tests.test_identity_preload.IdentityPreloadTests.test_real_processes_overlap_and_keep_the_same_source_bytes',
  'tests.test_identity_preload.IdentityPreloadTests.test_failures_timeout_and_launch_error_reap_every_started_process'],
  cwd=root,capture_output=True,text=True,timeout=20)
 print(json.dumps({'status':'PASS' if result.returncode==0 else 'FAIL',
  'platform':platform.platform(),'python':platform.python_version(),'checks':2,
  'output':result.stdout+result.stderr,'realGPUInference':False,'temporaryDirectoryRemovedOnExit':True}))
 sys.exit(result.returncode)
'''
import shlex
result=subprocess.run(['ssh','-o','ClearAllForwardings=yes','-o','BatchMode=yes','-o','ConnectTimeout=10',
    'headless','python3 -c '+shlex.quote(remote)],input=json.dumps(files),text=True,capture_output=True,timeout=40)
if result.returncode:
    print(result.stdout);print(result.stderr,file=__import__('sys').stderr)
    raise SystemExit(result.returncode)
report=json.loads(result.stdout)
report['sourceSHA256']={name:hashlib.sha256(text.encode()).hexdigest() for name,text in files.items()}
report['scope']='Linux x86_64 process overlap, failure, launch-error and timeout cleanup only; no model/audio execution'
(Path(__file__).parent/'linux-control-tests.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
