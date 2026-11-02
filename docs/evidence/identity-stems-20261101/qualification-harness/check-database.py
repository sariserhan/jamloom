from pathlib import Path
import tempfile,subprocess,os,socket,shutil
root=Path(__file__).resolve().parent.parent
base=Path(tempfile.mkdtemp(prefix='jamloom-readiness-pg-'))
pg=Path('/opt/homebrew/opt/postgresql@16/bin')
with socket.socket() as s:
 s.bind(('127.0.0.1',0));port=s.getsockname()[1]
started=False
try:
 with (base/'init.log').open('w') as log:subprocess.run([str(pg/'initdb'),'-D',str(base/'data'),'-U','jamloom_check','-A','trust'],stdout=log,stderr=subprocess.STDOUT,check=True,timeout=40)
 subprocess.run([str(pg/'pg_ctl'),'-D',str(base/'data'),'-l',str(base/'server.log'),'-o',f'-h 127.0.0.1 -p {port} -k {base}','-w','start'],check=True,timeout=30,stdout=subprocess.DEVNULL)
 started=True
 env=os.environ.copy();env['JAMLOOM_TEST_DATABASE_URL']=f'postgresql://jamloom_check@127.0.0.1:{port}/postgres'
 with (root/'build-identity-stems-20261101/database-tests.log').open('w') as log:r=subprocess.run(['/opt/homebrew/opt/node@22/bin/node','--import','tsx','--test','tests/cloud-songs.test.ts'],cwd=root/'apps/site',env=env,stdout=log,stderr=subprocess.STDOUT,timeout=180)
 print('Disposable database test exit:',r.returncode)
 raise SystemExit(r.returncode)
finally:
 if started:subprocess.run([str(pg/'pg_ctl'),'-D',str(base/'data'),'-m','immediate','-w','stop'],check=True,timeout=30,stdout=subprocess.DEVNULL)
 shutil.rmtree(base)
