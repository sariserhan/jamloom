import pathlib,json,subprocess,os,time
root=pathlib.Path.cwd();d=root/'build-identity-stems-20261101'
plan=json.loads((root/'docs/evidence/identity-stems-20261101/hosted-plan.json').read_text())
assert plan['status']=='APPROVED', 'Explicit bounded approval required'
assert plan['image'] and plan['maxRequests']==1 and plan['maxUSD']==1
lease=json.loads((d/'lease.json').read_text());remaining=lease['expiresAt']/1000-time.time()-360
assert remaining>0 and lease['maxMicros']==1000000, 'No deployment outside the original lease'
config=json.loads((d/'deployment-env-private.json').read_text());env=os.environ.copy();env['PATH']='/opt/homebrew/opt/node@22/bin:'+env['PATH']
os.umask(0o077)
with (d/'deployment-claimed.json').open('x') as claim:json.dump({'at':time.time(),'source':plan['applicationCommit'],'expiresAt':lease['expiresAt']},claim)
cmd=['/Users/serhansari/.nvm/versions/node/v22.23.1/bin/vercel','deploy','--prod','--skip-domain','--yes','--json','--debug']
for key,value in config.items():cmd+=['--env',key+'='+value]
with (d/'deployment-url.json').open('w') as out,(d/'deployment.log').open('w') as log:
 result=subprocess.run(cmd,cwd=d/'deploy-source',env=env,stdout=out,stderr=log,timeout=remaining)
print('Diagnostic deployment command exit:',result.returncode)
raise SystemExit(result.returncode)
