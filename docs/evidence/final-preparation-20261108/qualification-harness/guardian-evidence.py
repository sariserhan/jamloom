from pathlib import Path
import json,subprocess
p=Path(__file__).resolve().parent
start=json.loads((p/'lease.json').read_text())['startsAt']//1000
r=subprocess.run(['ssh','-o','ClearAllForwardings=yes','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=5','headless','journalctl --user -u jamloom-capacity.service --since @'+str(start)+' --no-pager -o cat'],capture_output=True,text=True,timeout=30)
assert r.returncode==0
keys={'at','state','reason','event','stage','kind','operation','status','code','emergencyShutdown'}
items=[]
for line in r.stdout.splitlines():
 try:row=json.loads(line)
 except ValueError:continue
 if not isinstance(row,dict):continue
 clean={k:v for k,v in row.items() if k in keys and isinstance(v,(str,int,bool,type(None))) and (not isinstance(v,str) or len(v)<90)}
 if clean:items.append(clean)
report={'status':'PASS','events':items,'failureCount':sum(x.get('event')=='capacity-check-failed' for x in items),'unconfirmedShutdownCount':sum(x.get('event')=='emergency-shutdown-unconfirmed' for x in items),'sanitized':True}
(p/'guardian-events.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'events':len(items),'failureCount':report['failureCount'],'unconfirmedShutdownCount':report['unconfirmedShutdownCount']}))
