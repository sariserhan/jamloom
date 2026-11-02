import urllib.request,urllib.parse,json,hashlib,tarfile,io,pathlib,sys
root=pathlib.Path(__file__).resolve().parents[1];out=pathlib.Path(__file__).parent
repo='sariserhan/jamloom/music-worker';ref=sys.argv[1]
query=urllib.parse.urlencode({'service':'ghcr.io','scope':f'repository:{repo}:pull'})
token=json.load(urllib.request.urlopen('https://ghcr.io/token?'+query))['token']
accept='application/vnd.oci.image.index.v1+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json'
def fetch(kind,ref,limit=1048576):
 req=urllib.request.Request(f'https://ghcr.io/v2/{repo}/{kind}/{ref}',headers={'Authorization':'Bearer '+token,'Accept':accept})
 with urllib.request.urlopen(req,timeout=30) as response:data=response.read(limit+1)
 assert len(data)<=limit
 if ref.startswith('sha256:'):assert 'sha256:'+hashlib.sha256(data).hexdigest()==ref
 return data

def manifest(ref):
 data=fetch('manifests',ref);m=json.loads(data)
 if 'manifests' in m:
  selected=[i for i in m['manifests'] if i.get('platform',{}).get('architecture')=='amd64' and i['platform'].get('os')=='linux'];assert len(selected)==1
  return manifest(selected[0]['digest'])
 return 'sha256:'+hashlib.sha256(data).hexdigest(),m
base_digest,base=manifest('sha256:fc903cdc7f41404c7bbe5067a467379106959c39b2172a7629a20bc8b7d8e9bc')
image_digest,updated=manifest(ref)
assert updated['layers'][:len(base['layers'])]==base['layers']
base_config=json.loads(fetch('blobs',base['config']['digest']));config=json.loads(fetch('blobs',updated['config']['digest']))
for key in ['architecture','os','config']:assert config[key]==base_config[key],key
worker=root/'build-identity-stems-worker-20261101'
expected=json.loads((worker/'services/runpod/runtime-base.json').read_text())['runtimeFiles'];seen={}
extra=updated['layers'][len(base['layers']):]
for layer in extra:
 assert layer['size']<1048576
 data=fetch('blobs',layer['digest']);assert len(data)==layer['size']
 with tarfile.open(fileobj=io.BytesIO(data),mode='r:*') as tar:
  for item in tar:
   if item.isdir():continue
   assert item.isfile()
   name=item.name.removeprefix('./').removeprefix('opt/jamloom/')
   assert name in expected and name not in seen,name
   blob=tar.extractfile(item).read();assert blob==(worker/name).read_bytes(),name
   seen[name]=hashlib.sha256(blob).hexdigest()
assert set(seen)==set(expected)
report={'status':'PASS','sourceCommit':ref,'image':'ghcr.io/'+repo+'@'+image_digest,'baseImage':'ghcr.io/'+repo+'@sha256:fc903cdc7f41404c7bbe5067a467379106959c39b2172a7629a20bc8b7d8e9bc','basePlatformDigest':base_digest,'baseLayersPreserved':len(base['layers']),'additionalLayers':len(extra),'additionalCompressedBytes':sum(x['size'] for x in extra),'runtimeConfigurationUnchanged':True,'modelLayersDownloaded':False,'runtimeFiles':seen}
(out/'image.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
