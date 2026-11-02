from pathlib import Path
import json,os,subprocess,time
root=Path(__file__).resolve().parent.parent;d=root/'build-readiness-recovery-20261102';node='/opt/homebrew/opt/node@22/bin/node';env=os.environ.copy();env['PATH']='/opt/homebrew/opt/node@22/bin:'+env['PATH']
assert json.loads((root/'docs/evidence/readiness-recovery-20261102/hosted-plan.json').read_text())['status']=='APPROVED'
assert json.loads((d/'diagnostic-candidate-guard.json').read_text())['status']=='PASS'
assert time.time()*1000<json.loads((d/'permit.json').read_text())['expiresAt']-2400000
http=None;caffeine=None
with (d/'controller.log').open('x') as cl,(d/'http.log').open('x') as hl:
 control=subprocess.Popen([node,'--import','tsx',str(d/'control.mts'),'--apply'],cwd=root/'apps/site',env=env,stdout=cl,stderr=subprocess.STDOUT)
 caffeine=subprocess.Popen(['/usr/bin/caffeinate','-i','-w',str(control.pid)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 try:
  for _ in range(50):
   if (d/'lease.json').exists():break
   assert control.poll() is None,'Controller stopped before lease';time.sleep(.1)
  lease=json.loads((d/'lease.json').read_text())
  http=subprocess.Popen([node,'--import','tsx',str(d/'http.mts'),'--apply'],cwd=root/'apps/site',env=env,stdout=hl,stderr=subprocess.STDOUT)
  (d/'processes.json').write_text(json.dumps({'controller':control.pid,'http':http.pid,'caffeine':caffeine.pid,'deadline':lease['expiresAt']}))
  control.wait(timeout=max(1,lease['expiresAt']/1000-time.time()+130))
  http.wait(timeout=45)
  print('Controller exit',control.returncode,'HTTP exit',http.returncode,flush=True)
 finally:
  if caffeine and caffeine.poll() is None:caffeine.terminate()
