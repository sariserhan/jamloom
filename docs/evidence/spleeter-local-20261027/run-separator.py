import sys,os,json,subprocess,time,signal,shutil
from pathlib import Path
root=Path.cwd();sys.path.insert(0,str(root/'scripts'))
from render_singing_originals import resource_problem
import psutil
out=root/'docs/evidence/spleeter-local-20261027'
for case in ['deep-house-male','eurodance-female']:
    assert not (out/(case+'-execution.json')).exists()
    problem=resource_problem(psutil.virtual_memory().available,shutil.disk_usage(root).free,starting=True)
    if problem:raise RuntimeError(problem)
    report={'case':case,'status':'FAIL','peak_rss_bytes':0,'paid_compute':False};start=time.monotonic();p=None
    try:
        with (out/(case+'.log')).open('x') as log:
            p=subprocess.Popen([str(root/'build-spleeter/venv/bin/python'),str(root/'scripts/separate_spleeter.py'),'--input',str(root/f'renders/singing-originals-20261027/{case}/singer.wav'),'--output',str(root/f'renders/spleeter-local-20261027/{case}')],stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
            while p.poll() is None:
                rss=sum(int(r.split()[1])*1024 for r in subprocess.check_output(['ps','-axo','pgid=,rss='],text=True).splitlines() if int(r.split()[0])==p.pid)
                report['peak_rss_bytes']=max(rss,report['peak_rss_bytes'])
                problem=resource_problem(psutil.virtual_memory().available,shutil.disk_usage(root).free,rss,time.monotonic()-start)
                if problem:raise RuntimeError(problem)
                time.sleep(2)
            report['exit_code']=p.returncode
            if p.returncode:raise RuntimeError('Separator failed; stop without retry')
            report['status']='PASS technical; listening NOT RUN'
    except BaseException as e:
        report['error']=str(e);raise
    finally:
        if p is not None:
            try:os.killpg(p.pid,signal.SIGKILL)
            except ProcessLookupError:pass
            p.wait()
        report['seconds']=time.monotonic()-start;(out/(case+'-execution.json')).write_text(json.dumps(report,indent=2)+'\n')
        print(json.dumps(report),flush=True)
