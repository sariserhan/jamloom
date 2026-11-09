import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {save} from './deployed-common.mts';
export async function remoteGuardian(action:'start'|'stop'|'preview',permit:any){
 const script=await readFile(new URL('remote-guardian.py',import.meta.url),'utf8');
 // The remote shell receives only a fixed command and base64 of this reviewed script.
 const encoded=Buffer.from(script).toString('base64');assert(/^[A-Za-z0-9+/=]+$/.test(encoded));
 const cmd=`python3 -c "import base64;exec(base64.b64decode('${encoded}'))"`;
 const child=spawn('ssh',['-o','ClearAllForwardings=yes','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=5','headless',cmd],{stdio:['pipe','pipe','pipe']});
 let output='',error='';child.stdout.on('data',d=>output+=String(d));child.stderr.on('data',d=>error+=String(d));child.stdin.end(JSON.stringify({action,permit}));
 const status=await new Promise<number|null>((resolve,reject)=>{const timer=setTimeout(()=>{child.kill();reject(Error('Remote guardian state uncertain'));},120000);child.on('error',e=>{clearTimeout(timer);reject(e);});child.on('exit',code=>{clearTimeout(timer);resolve(code);});});
 assert.equal(status,0,'Remote guardian failed; inspect private operator log');
 const report=JSON.parse(output);assert.equal(report.status,'PASS');await save('remote-guardian-'+action+'.json',report);return report;
}
if(process.argv.includes('--preview'))await remoteGuardian('preview',{id:'release-00000000-0000-0000-0000-000000000000'});
