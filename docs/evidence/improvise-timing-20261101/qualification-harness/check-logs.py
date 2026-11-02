"""Extract only validated stage timing records from private worker log streams."""
import json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from generation_timing import PHASES,MAX_EVENTS,MAX_MS
root=Path(__file__).resolve().parent
receipts=[]
for path in [*root.glob('worker-*-private.log'),root/'terminal-worker-private.log']:
 if not path.exists():continue
 data=path.read_text(errors='replace')
 texts=[data]
 for line in data.splitlines():
  if line.startswith('data:'):
   try:
    value=json.loads(line[5:].strip())
    if isinstance(value,dict):texts.extend(v for v in value.values() if isinstance(v,str))
    elif isinstance(value,str):texts.append(value)
   except ValueError:pass
 for text in texts:
  marker='JAMLOOM_PHASE_TIMINGS '
  offset=0
  while marker in text[offset:]:
   start=text.index(marker,offset)+len(marker);offset=start
   try:value,end=json.JSONDecoder().raw_decode(text[start:])
   except ValueError:continue
   if not isinstance(value,dict) or set(value)!={'schema','events','active','outcome','elapsed_ms'}:continue
   if value['schema']!='jamloom-phase-timing-1' or value['outcome'] not in ('completed','failed','timeout'):continue
   if type(value['elapsed_ms']) is not int or not 0<=value['elapsed_ms']<=MAX_MS:continue
   if not isinstance(value['active'],list) or any(not isinstance(p,str) or p not in PHASES for p in value['active']):continue
   events=value['events']
   if not isinstance(events,list) or not 1<=len(events)<=MAX_EVENTS:continue
   if any(not isinstance(e,dict) or set(e)!={'phase','event','ms'} or not isinstance(e['phase'],str) or e['phase'] not in PHASES or e['event'] not in ('start','end') or type(e['ms']) is not int or not 0<=e['ms']<=MAX_MS for e in events):continue
   if value not in receipts:receipts.append(value)
report={'status':'PASS' if receipts else 'NOT_CAPTURED','receipts':receipts}
(root/'phase-timings.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
