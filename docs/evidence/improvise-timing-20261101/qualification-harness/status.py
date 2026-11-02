from pathlib import Path
import json,datetime
p=Path(__file__).resolve().parent
def read(n):return json.loads((p/n).read_text())
s=read('style-control-state.json');o=read('style-observation-private.json');r={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'preparationSecondsLeft':max(0,round((s.get('preparationDeadline',s['deadline'])-datetime.datetime.now(datetime.timezone.utc).timestamp()*1000)/1000)),'latestHealth':o['samples'][-1] if o['samples'] else None,'observedWorkers':[{k:w.get(k) for k in ['id','gpuTypeId','status','observedAt']} for w in o['workers']]}
files=list(p.glob('worker-*-private.log'))
if files:
 events=[]
 for line in max(files,key=lambda x:x.stat().st_mtime).read_text(errors='replace').splitlines():
  if line.startswith('data:'):
   try:events.append(json.loads(line[5:]))
   except ValueError:pass
 r['logKeywordCounts']={k:sum(k in x.get('line','').lower() for x in events) for k in ['downloading','extracting','pull complete','error','out of memory','handler']}
for name in ['style-http-state.json','style-http-result.json','style-control-result.json']:
 if (p/name).exists():
  x=read(name);r[name]={k:x.get(k) for k in ['status','error','cleanup'] if k in x};r[name]['requests']=[{k:q.get(k) for k in ['product','state','submitCalls','executionMs','delayMs','estimatedCostMicros','audio','privacy'] if k in q} for q in x.get('requests',[])]
print(json.dumps(r))
