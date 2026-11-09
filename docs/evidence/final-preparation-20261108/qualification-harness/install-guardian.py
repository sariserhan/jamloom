from pathlib import Path
import base64, hashlib, json, subprocess
root=Path(__file__).resolve().parent.parent;d=Path(__file__).resolve().parent
package=root/'build-recovery-validation-20261108/guardian'
manifest=json.loads((package/'manifest.json').read_text());binary=(package/'watchdog.mjs').read_bytes()
assert hashlib.sha256(binary).hexdigest()==manifest['sha256']
stage=json.loads((d/'staging-database-private.json').read_text())
remote=r'''
from pathlib import Path
import sys,json,os,subprocess,hashlib,base64,shlex,urllib.parse
p=json.load(sys.stdin);base=Path.home()/'.local/share/jamloom-capacity';config=Path.home()/'.config/jamloom-capacity';envfile=config/'capacity.env';unit='jamloom-capacity.service'
assert not (config/'enabled').exists()
assert subprocess.run(['systemctl','--user','is-active','--quiet',unit]).returncode!=0
assert envfile.stat().st_mode&0o777==0o600
lines=envfile.read_text().splitlines();parsed={}
for line in lines:
 if line and not line.startswith('#'):
  key,value=line.split('=',1);parts=shlex.split(value);parsed[key]=parts[0] if parts else ''
assert not parsed.get('JAMLOOM_CLOUD_CAPACITY_PERMIT')
url=urllib.parse.urlsplit(p['url']);assert url.hostname.endswith('.neon.tech') and url.path=='/jamloom_stage_20261108'
before=base/'current';previous=os.readlink(before)
revision=base/p['manifest']['sourceCommit'];revision.mkdir(exist_ok=False)
data=base64.b64decode(p['binary']);assert hashlib.sha256(data).hexdigest()==p['manifest']['sha256']
(revision/'watchdog.mjs').write_bytes(data);(revision/'manifest.json').write_text(json.dumps(p['manifest']))
subprocess.run(['node','--check',str(revision/'watchdog.mjs')],check=True,capture_output=True)
backup=config/'capacity.env.before-staging-20261108'
fd=os.open(backup,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
with os.fdopen(fd,'w') as f:f.write(envfile.read_text())
changes={'DATABASE_URL':p['url'],'JAMLOOM_WATCHDOG_TARGET':url.hostname+((':'+str(url.port)) if url.port else '')+url.path}
assert all(k in parsed for k in changes)
for k,v in changes.items():parsed[k]=v
content='\n'.join(k+'='+shlex.quote(v) for k,v in parsed.items())+'\n'
temporary=config/'capacity.env.next';fd=os.open(temporary,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
with os.fdopen(fd,'w') as f:f.write(content)
os.replace(temporary,envfile)
link=base/'current.next';link.symlink_to(revision);os.replace(link,before)
run=subprocess.run(['node',str(revision/'watchdog.mjs')],env={**os.environ,**parsed},capture_output=True,text=True,timeout=30,check=True)
preview=json.loads(run.stdout);assert preview['mode']=='preview' and preview['cycles']==[]
print(json.dumps({'status':'PASS','sourceCommit':p['manifest']['sourceCommit'],'sha256':p['manifest']['sha256'],'serviceActive':False,'permitConfigured':False,'database':'jamloom_stage_20261108','preview':preview,'previousRevision':previous,'productionEnvironmentBackedUp':True,'gpuOperations':0}))
'''
cmd="python3 -c \"import base64;exec(base64.b64decode('"+base64.b64encode(remote.encode()).decode()+"'))\""
payload={'manifest':manifest,'binary':base64.b64encode(binary).decode(),'url':stage['url']}
r=subprocess.run(['ssh','-o','ClearAllForwardings=yes','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=5','headless',cmd],input=json.dumps(payload),capture_output=True,text=True,timeout=60)
if r.returncode:raise RuntimeError('Guardian installation failed; inspect state before retrying')
report=json.loads(r.stdout);(d/'guardian-installation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
