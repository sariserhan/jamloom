"""Package only the reviewed runtime overlay; does not build or publish an image."""
import gzip
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tarfile

ROOT=Path(__file__).resolve().parents[3]
candidate=ROOT/'build-identity-preload-20261108/source'
sys.path.insert(0,str(candidate/'scripts'))
from check_worker_runtime_base import validate

validation=validate(candidate)
assert not subprocess.check_output(['git','status','--porcelain'],cwd=candidate),'Candidate must be committed and clean'
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=candidate,text=True).strip()
manifest=json.loads((candidate/'services/runpod/runtime-base.json').read_text())
live=json.loads((ROOT/'docs/evidence/identity-stems-20261101/image.json').read_text())
assert manifest['baseImage']==live['baseImage']
for name in ('scripts/vocal_identity.py','scripts/generation_timing.py'):
    assert (ROOT/name).read_bytes()==(candidate/name).read_bytes(),'Main/candidate patch mismatch'
assert hashlib.sha256((candidate/'scripts/singer_studio.py').read_bytes()).hexdigest()==live['runtimeFiles']['scripts/singer_studio.py']
files={'Dockerfile':(candidate/'services/runpod/Dockerfile.runtime').read_bytes(),
       '.dockerignore':(candidate/'services/runpod/Dockerfile.runtime.dockerignore').read_bytes(),
       **{name:(candidate/name).read_bytes() for name in manifest['runtimeFiles']}}
archive=candidate.parent/'runtime-context.tar.gz'
with archive.open('wb') as output,gzip.GzipFile(filename='',fileobj=output,mode='wb',mtime=0) as compressed,tarfile.open(fileobj=compressed,mode='w') as tar:
    for name,data in sorted(files.items()):
        info=tarfile.TarInfo(name);info.size=len(data);info.mode=0o644;tar.addfile(info,io.BytesIO(data))
with tarfile.open(archive) as tar:
    assert sorted(tar.getnames())==sorted(files)
    for name,data in files.items():assert tar.extractfile(name).read()==data
report={'status':'PASS isolated source and build-context integrity; NOT RUN image build/publication',
        'candidateCommit':commit,'acceptedWorkerSource':live['sourceCommit'],'acceptedWorkerImage':live['image'],
        'baseValidation':validation,'runtimeSHA256':{name:hashlib.sha256((candidate/name).read_bytes()).hexdigest() for name in manifest['runtimeFiles']},
        'archiveSHA256':hashlib.sha256(archive.read_bytes()).hexdigest(),'archiveBytes':archive.stat().st_size,
        'fileNames':sorted(files),'preloadEnabledByDefault':False,'liveBackendChanged':False,
        'modelOrDependencyChanges':False,'imageBuild':'NOT RUN','cudaQualification':'NOT RUN'}
(Path(__file__).parent/'candidate.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
