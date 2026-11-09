from pathlib import Path
import tempfile,subprocess,os,socket,shutil
root=Path.cwd();d=root/'build-review-phase-20261108';pg='/opt/homebrew/opt/postgresql@18/bin/';data=Path(tempfile.mkdtemp(prefix='jamloom-review-pg-'));started=False
with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
try:
 with (d/'test-database.log').open('w') as out:
  subprocess.run([pg+'initdb','-D',str(data),'-A','trust','--no-locale','-E','UTF8'],check=True,stdout=out,stderr=out)
  subprocess.run([pg+'pg_ctl','-D',str(data),'-l',str(d/'test-postgres.log'),'-o',f'-h 127.0.0.1 -p {port} -k {data}','-w','start'],check=True,stdout=out,stderr=out);started=True
 env=os.environ.copy();env['JAMLOOM_TEST_DATABASE_URL']=f'postgresql://127.0.0.1:{port}/postgres'
 with (d/'review-capacity-tests.log').open('w') as out:
  r=subprocess.run(['/opt/homebrew/opt/node@22/bin/node','--import','tsx','--test','--test-concurrency=1','tests/cloud-capacity.test.ts','tests/cloud-songs.test.ts'],cwd=root/'apps/site',env=env,stdout=out,stderr=out)
 print('Isolated review capacity tests exit',r.returncode);raise SystemExit(r.returncode)
finally:
 if started:subprocess.run([pg+'pg_ctl','-D',str(data),'-m','fast','-w','stop'],check=True,capture_output=True)
 if data.name.startswith('jamloom-review-pg-'):shutil.rmtree(data)
