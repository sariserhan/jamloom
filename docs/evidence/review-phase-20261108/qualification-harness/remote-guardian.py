import json,os,re,subprocess,sys
from pathlib import Path
p=json.load(sys.stdin);action=p['action'];permit=p['permit'];assert action in ('start','stop','preview')
assert re.fullmatch(r'release-[a-f0-9-]{36}',permit['id'])
home=Path.home();base=home/'.local/share/jamloom-capacity';config=home/'.config/jamloom-capacity';env=config/'capacity.env';marker=config/'enabled';unit='jamloom-capacity.service'
manifest=json.loads((base/'current/manifest.json').read_text())
assert manifest['sourceCommit']=='3849153a01bba5b751c66fb48df4195becd60016'
import hashlib
assert hashlib.sha256((base/'current/watchdog.mjs').read_bytes()).hexdigest()=='28a7e6a4c19f91be3ce6ce054ded39d1ee75c10bac0055deec00c2c6c5a94699'
assert env.stat().st_mode & 0o777 == 0o600
lines=env.read_text().splitlines();prefix='JAMLOOM_CLOUD_CAPACITY_PERMIT=';found=[s[len(prefix):] for s in lines if s.startswith(prefix)];assert len(found)==1
raw=found[0]
if raw.startswith("'") and raw.endswith("'"):raw=raw[1:-1]
elif raw.startswith('"') and raw.endswith('"'):raw=json.loads(raw)
current=json.loads(raw) if raw else None
assert current is None or current['id']==permit['id'],'Different active permit; refuse replacement'
def command(args):return subprocess.run(args,check=True,capture_output=True,text=True,timeout=110)
def update(value):
 content='\n'.join(prefix+value if s.startswith(prefix) else s for s in lines)+'\n'
 temp=config/'capacity.env.next';fd=os.open(temp,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
 with os.fdopen(fd,'w') as f:f.write(content)
 os.replace(temp,env)
if action=='start':
 import shlex,urllib.parse
 parsed={}
 for line in lines:
  if line and not line.startswith('#'):
   key,value=line.split('=',1);parts=shlex.split(value);parsed[key]=parts[0] if parts else ''
 url=urllib.parse.urlsplit(parsed['DATABASE_URL']);assert url.hostname.endswith('.neon.tech') and url.path=='/neondb'
 assert parsed['JAMLOOM_WATCHDOG_TARGET']==url.hostname+((':'+str(url.port)) if url.port else '')+url.path
 backup=config/'capacity.env.before-review-20261108'
 fd=os.open(backup,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
 with os.fdopen(fd,'w') as f:f.write(env.read_text())
 assert permit['expiresAt']-permit['startsAt']==7*86400000

 assert not marker.exists() and current is None
 assert subprocess.run(['systemctl','--user','is-active','--quiet',unit]).returncode!=0
 assert permit['capMicros']==7500000 and permit['cycleMicros']==750000 and permit['cycleSeconds']==2400
 import time
 assert permit['startsAt']<=time.time()*1000<permit['expiresAt']
 update("'"+json.dumps(permit,separators=(',',':'))+"'");marker.touch(mode=0o600)
 command(['systemctl','--user','start',unit]);command(['systemctl','--user','is-active','--quiet',unit])
elif action=='stop':
 marker.unlink(missing_ok=True);command(['systemctl','--user','stop',unit]);update('')
 assert subprocess.run(['systemctl','--user','is-active','--quiet',unit]).returncode!=0
else:
 assert current is None and not marker.exists()
 assert subprocess.run(['systemctl','--user','is-active','--quiet',unit]).returncode!=0
print(json.dumps({'status':'PASS','action':action,'serviceActive':action=='start','permitConfigured':action=='start','sourceCommit':manifest['sourceCommit']}))
