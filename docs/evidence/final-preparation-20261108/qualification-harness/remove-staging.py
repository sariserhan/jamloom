from pathlib import Path
import json,subprocess,datetime
root=Path(__file__).resolve().parent;project=root.parent
for name in ('style-cleanup.json','guardian-restored.json'):
 assert json.loads((root/name).read_text())['status']=='PASS'
cli='/Users/serhansari/.nvm/versions/node/v22.23.1/bin/vercel'
public='dpl_JAJN6SrY6zU2sVsv76Eu17joV8Tu'
def inspect(target):
 r=subprocess.run([cli,'inspect',target,'--scope','ssari'],cwd=project,capture_output=True,text=True,timeout=45)
 assert r.returncode==0,'Inspection failed'
 return r.stdout+r.stderr
before=inspect('https://www.jamloom.com');assert public in before
candidates=[json.loads((root/'deployment-attempt-2/diagnostic-deployment-url.json').read_text())['deployment'],json.loads((root/'diagnostic-deployment-url.json').read_text())['deployment']]
removed=[]
for d in candidates:
 assert d['id'].startswith('dpl_') and d['id']!=public
 previous=root/(d['id']+'-removal.log')
 if previous.exists() and 'Success! Removed 1 deployment' in previous.read_text():
  r=subprocess.run([cli,'inspect',d['url'],'--scope','ssari'],cwd=project,capture_output=True,text=True,timeout=45)
  assert r.returncode!=0 and "can't find the deployment" in (r.stdout+r.stderr).lower()
  removed.append({'id':d['id'],'url':d['url'],'removed':True});continue
 details=inspect(d['url']);assert d['id'] in details
 assert 'www.jamloom.com' not in details and 'https://jamloom.com' not in details
 r=subprocess.run([cli,'remove',d['id'],'--safe','--yes','--scope','ssari'],cwd=project,capture_output=True,text=True,timeout=60)
 (root/(d['id']+'-removal.log')).write_text(r.stdout+r.stderr)
 assert r.returncode==0,'Temporary candidate removal failed'
 r=subprocess.run([cli,'inspect',d['url'],'--scope','ssari'],cwd=project,capture_output=True,text=True,timeout=45)
 assert r.returncode!=0 and ('not found' in (r.stdout+r.stderr).lower() or 'could not find' in (r.stdout+r.stderr).lower() or "can't find the deployment" in (r.stdout+r.stderr).lower()),'Removal needs readback'
 removed.append({'id':d['id'],'url':d['url'],'removed':True})
after=inspect('https://www.jamloom.com');assert public in after
(root/'public-deployment-after.log').write_text(after)
report={'status':'PASS','at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'removed':removed,'publicDeploymentUnchanged':True,'publicDeployment':public}
(root/'staging-deployments-removed.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
