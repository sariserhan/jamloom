import datetime,json,os,time
from pathlib import Path
import psutil
root=Path('/Users/serhansari/Documents/projects/jamloom')
source=root/'renders/local-neural-qualification-20261030/campaign.json'
target=root/'docs/evidence/local-qualification-followthrough-20261030/process-observer.json'
report={'scope':'Independent process-group observation from this checkpoint onward; earlier cases retain executor stop receipts','started_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'maximum_active_groups':0,'groups':{},'status':'RUNNING'}
while True:
    state=json.loads(source.read_text());active=[]
    for process in psutil.process_iter(['pid','cmdline','create_time']):
        args=process.info['cmdline'] or []
        if '--child' not in args or not any(arg.endswith('/scripts/improvise_local_audition.py') for arg in args):continue
        if not any('improvise-local-audition-local-neural-qualification-20261030-' in arg for arg in args):continue
        try:group=os.getpgid(process.pid)
        except ProcessLookupError:continue
        active.append(group);report['groups'].setdefault(str(group),dict(pid=process.pid,created_at=process.info['create_time']))
    report['maximum_active_groups']=max(report['maximum_active_groups'],len(set(active)))
    report['last_active_groups']=active;report['completed_at_checkpoint']=len(state['completed'])
    report['updated_at']=datetime.datetime.now(datetime.timezone.utc).isoformat()
    if state['status']!='RUNNING':
        remaining=[]
        for row in report['groups'].values():
            try:
                if psutil.Process(row['pid']).create_time()==row['created_at']:remaining.append(row['pid'])
            except psutil.NoSuchProcess:pass
        report['remaining_observed_processes']=remaining
        report['status']='PASS observed concurrency and final cleanup' if not active and not remaining and report['maximum_active_groups']<=1 else 'FAIL process cleanup or concurrency'
    temporary=target.with_suffix('.partial');temporary.write_text(json.dumps(report,indent=2)+'\n');temporary.replace(target)
    if state['status']!='RUNNING':break
    time.sleep(1)
