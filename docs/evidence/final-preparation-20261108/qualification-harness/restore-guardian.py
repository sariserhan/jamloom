from pathlib import Path
import base64,json,subprocess
root=Path(__file__).resolve().parent
assert json.loads((root/'style-cleanup.json').read_text())['status']=='PASS'
remote=r'''
from pathlib import Path
import os,shlex,subprocess,json,urllib.parse,hashlib
config=Path.home()/'.config/jamloom-capacity';envfile=config/'capacity.env';backup=config/'capacity.env.before-staging-20261108'
assert subprocess.run(['systemctl','--user','is-active','--quiet','jamloom-capacity.service']).returncode!=0
assert not (config/'enabled').exists()
content=backup.read_text();parsed={}
for line in content.splitlines():
 if line and not line.startswith('#'):
  k,v=line.split('=',1);p=shlex.split(v);parsed[k]=p[0] if p else ''
assert not parsed.get('JAMLOOM_CLOUD_CAPACITY_PERMIT')
u=urllib.parse.urlsplit(parsed['DATABASE_URL']);assert u.hostname.endswith('.neon.tech') and u.path=='/neondb'
tmp=config/'capacity.env.restore-20261108';fd=os.open(tmp,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
with os.fdopen(fd,'w') as f:f.write(content)
os.replace(tmp,envfile);assert envfile.read_bytes()==backup.read_bytes()
manifest=json.loads((Path.home()/'.local/share/jamloom-capacity/current/manifest.json').read_text())
print(json.dumps({'status':'PASS','serviceActive':False,'enabledMarker':False,'permitConfigured':False,'productionEnvironmentRestoredByteForByte':True,'guardianSource':manifest['sourceCommit']}))
'''
cmd="python3 -c \"import base64;exec(base64.b64decode('"+base64.b64encode(remote.encode()).decode()+"'))\""
r=subprocess.run(['ssh','-o','ClearAllForwardings=yes','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=5','headless',cmd],capture_output=True,text=True,timeout=30)
assert r.returncode==0,'Guardian restoration failed; inspect safely'
report=json.loads(r.stdout);(root/'guardian-restored.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
