from pathlib import Path
import json,subprocess,os,time
root=Path(__file__).resolve().parent.parent;d=Path(__file__).resolve().parent;source=d/'deploy-source';plan=json.loads((root/'docs/evidence/review-phase-20261108/approved-plan.json').read_text());assert plan['status']=='APPROVED'
permit=json.loads((d/'permit.json').read_text());assert time.time()*1000<permit['expiresAt']-2400000
for name in ['apps/site/lib/cloud-review-config.ts','apps/site/lib/cloud-capacity.ts','apps/site/lib/cloud-capacity-permit.ts','apps/site/scripts/capacity-watchdog.ts','apps/site/lib/cloud-songs.ts']:
 expected=subprocess.check_output(['git','show',plan['applicationCommit']+':'+name],cwd=root);assert (source/name).read_bytes()==expected
(d/'deployment-claimed.json').write_text(json.dumps({'at':time.time(),'source':plan['applicationCommit']})) if not (d/'deployment-claimed.json').exists() else (_ for _ in ()).throw(Exception('Deployment already claimed'))
args=['/Users/serhansari/.nvm/versions/node/v22.23.1/bin/vercel','deploy','--prod','--skip-domain','--yes','--json','--scope','ssari','--debug']
for key,value in json.loads((d/'review-environment-private.json').read_text()).items():args+=['--env',key+'='+str(value),'--build-env',key+'='+str(value)]
env=os.environ.copy();env['PATH']='/opt/homebrew/opt/node@22/bin:'+env['PATH']
with (d/'review-deployment-url.json').open('x') as out,(d/'review-deployment.log').open('x') as log:
 result=subprocess.run(args,cwd=source,env=env,stdout=out,stderr=log,timeout=max(1,(permit['expiresAt']/1000)-time.time()-2400))
print('Deployment exit:',result.returncode,flush=True)
raise SystemExit(result.returncode)
