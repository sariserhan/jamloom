"""Verify the retained local CPU image; never pushes, allocates a GPU or changes live settings."""
from pathlib import Path
import json,hashlib,subprocess,shlex
root=Path(__file__).resolve().parents[3];out=Path(__file__).resolve().parent
candidate=json.loads((root/'docs/evidence/cost-reduction-20261108/candidate.json').read_text())
source=root/'build-identity-preload-20261108/source'
assert subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()==candidate['candidateCommit']
subprocess.run(['git','-C',str(source),'diff','--quiet','HEAD','--','scripts','services/runpod','tests/test_identity_preload.py','tests/test_generation_timing.py'],check=True)
baseCheck=json.loads(subprocess.check_output([__import__('sys').executable,str(source/'scripts/check_worker_runtime_base.py')],text=True))
assert baseCheck['status']=='PASS' and baseCheck['unchangedInputs']==37
names=['tests/test_identity_preload.py','tests/test_generation_timing.py']
files={name:(source/name).read_text() for name in names}
remote=r'''
import pathlib,json,subprocess,sys,tempfile,hashlib,platform
p=json.load(sys.stdin);tag='jamloom-preload:bf57ca04'
assert hashlib.sha256(pathlib.Path('/tmp/jamloom-preload-context-20261108.tar.gz').read_bytes()).hexdigest()==p['archiveSHA256']
recipe=pathlib.Path('/tmp/jamloom-preload-build-20261108/Dockerfile').read_text().splitlines()
assert [line for line in recipe if line.startswith('FROM ')]==['FROM '+p['baseImage']]
image=json.loads(subprocess.check_output(['docker','image','inspect',tag],text=True))[0]
assert image['Architecture']=='amd64' and image['Os']=='linux'
assert 'JAMLOOM_IDENTITY_PRELOAD=1' not in image['Config'].get('Env',[])
with tempfile.TemporaryDirectory(prefix='jamloom-preload-image-check-') as folder:
 root=pathlib.Path(folder);tests=root/'tests';tests.mkdir();(tests/'__init__.py').touch()
 for name,text in p['files'].items():
  assert name in ['tests/test_identity_preload.py','tests/test_generation_timing.py'];(root/name).write_text(text)
 code="""import hashlib,json,pathlib,unittest,platform,sys,glob
assert glob.glob('/dev/nvidia*')==[], 'CPU verification must not expose GPU devices'
expected=json.loads(sys.argv[1]);actual={name:hashlib.sha256(pathlib.Path(name).read_bytes()).hexdigest() for name in expected};assert actual==expected
suite=unittest.TestSuite(unittest.defaultTestLoader.loadTestsFromName(name) for name in ['tests.test_identity_preload','tests.test_generation_timing'])
result=unittest.TextTestRunner(verbosity=1).run(suite)
print(json.dumps({'status':'PASS' if result.wasSuccessful() else 'FAIL','python':platform.python_version(),'tests':result.testsRun,'failures':len(result.failures),'errors':len(result.errors),'skipped':len(result.skipped),'runtimeSHA256':actual,'realGPUInference':False}))
sys.exit(0 if result.wasSuccessful() else 1)
"""
 command=['docker','run','--rm','--network','none','--cpus','2','--memory','4g','--pids-limit','128','--cap-drop','ALL','--security-opt','no-new-privileges','--read-only','--tmpfs','/tmp:rw,size=256m','-e','PYTHONDONTWRITEBYTECODE=1','-v',str(tests)+':/opt/jamloom/tests:ro','--workdir','/opt/jamloom','--entrypoint','/opt/jamloom/.venv-vocal-identity/bin/python',tag,'-c',code,json.dumps(p['runtime'])]
 result=subprocess.run(command,capture_output=True,text=True,timeout=120)
 if result.returncode:
  print(result.stdout);print(result.stderr,file=sys.stderr);sys.exit(result.returncode)
 detail=json.loads(result.stdout.strip().splitlines()[-1]);assert detail['tests']==15 and detail['skipped']==0
 print(json.dumps({'status':'PASS Linux CPU image build and fixture verification','imageID':image['Id'],'imageBytes':image['Size'],'architecture':image['Architecture'],'os':image['Os'],'runtimeChecks':detail,'network':'disabled','gpuDevices':0,'containerRemoved':True,'temporaryTestDirectoryRemovedOnExit':True,'imagePublished':False,'liveEndpointChanged':False,'candidateEnabled':False}))
'''
payload={'files':files,'runtime':candidate['runtimeSHA256'],'archiveSHA256':candidate['archiveSHA256'],'baseImage':candidate['baseValidation']['baseImage']}
r=subprocess.run(['ssh','-o','ClearAllForwardings=yes','headless','python3 -c '+shlex.quote(remote)],input=json.dumps(payload),capture_output=True,text=True,timeout=150)
if r.returncode:
 (root/'build-final-audit-20261108/worker-image-verification-error.log').write_text(r.stdout+'\n'+r.stderr);raise SystemExit('Image verification failed; inspect retained local log')
report=json.loads(r.stdout);report['candidateCommit']=candidate['candidateCommit'];report['baseInputValidation']=baseCheck;report['archiveSHA256']=candidate['archiveSHA256'];report['baseImage']=candidate['baseValidation']['baseImage'];report['testSHA256']={name:hashlib.sha256(text.encode()).hexdigest() for name,text in files.items()};report['at']=__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat();(out/'worker-image.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
