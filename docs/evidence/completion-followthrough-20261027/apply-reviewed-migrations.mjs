// Owner-authorized migrations only; no publication or payment activation.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,chmod,stat,rm} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createPool} from '../../../apps/site/lib/database.ts';
import pg from '../../../apps/site/node_modules/pg/lib/index.js';
import {migrate} from '../../../apps/site/lib/migrations.ts';
const root=fileURLToPath(new URL('../../../',import.meta.url));process.loadEnvFile(root+'apps/site/.env.local');
assert.deepEqual(process.argv.slice(2),['--apply-reviewed']);
const target=new URL(process.env.DATABASE_MIGRATION_URL||process.env.DATABASE_URL_UNPOOLED||'');
assert.equal(target.hostname,'ep-flat-hill-b4q0lix4.c-6.us-east-2.aws.neon.tech');assert.equal(target.pathname,'/neondb');
const expected=['0031_singing_price.sql','0032_account_deletion.sql'],directory=root+'build-release-followthrough-20261027-pg18-verified',backup=directory+'/before-0031-0032.dump';
await mkdir(directory,{mode:0o700});
const report={targetVerified:true,authorization:'Standing migration authorization plus owner do all on 2026-10-27',status:'STARTED',publication:false};
const socket='/tmp/jamloom-pg-'+randomUUID().slice(0,8),cluster=directory+'/postgres';await mkdir(socket,{mode:0o700});
const local={host:socket,port:55439,user:process.env.USER,max:1};
const output=new URL('migrations.json',import.meta.url),production=createPool(target.href),admin=new pg.Pool({...local,database:'postgres'});
const database='jamloom_migration_rehearsal_'+randomUUID().replaceAll('-','');assert.match(database,/^jamloom_migration_rehearsal_[a-f0-9]{32}$/);
let rehearsal,created=false,started=false;
async function state(pool){
 const client=await pool.connect();
 try {
  await client.query('BEGIN READ ONLY');await client.query("SET LOCAL TIME ZONE 'UTC'");
  const data={};for(const table of ['academy_purchases','credit_lots','wallet_ledger_entries','tracks'])data[table]=(await client.query(`SELECT count(*)::int AS count,md5(COALESCE(string_agg(row_to_json(t)::text,E'\\n' ORDER BY row_to_json(t)::text COLLATE "C"),'')) AS checksum FROM ${table} t`)).rows[0];
  await client.query('COMMIT');return data;
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
function command(binary,args,env){const r=spawnSync('/opt/homebrew/opt/postgresql@18/bin/'+binary,args,{env:{...process.env,...env},encoding:'utf8',timeout:120000});if(r.status!==0)throw Error(binary+' failed; production mutation not inferred');}
try{
 command('initdb',['-D',cluster,'--auth-local=trust','--auth-host=reject','--no-locale','--encoding=UTF8'],{});
 command('pg_ctl',['-D',cluster,'-l',directory+'/postgres.log','-o',`-k ${socket} -p 55439 -c listen_addresses=''`,'-w','start'],{});started=true;
 const before=await state(production);assert.equal((await production.query("SELECT count(*)::int AS count FROM academy_purchases WHERE NOT ((product_key='academy-complete' AND amount_cents=7999) OR (product_key='singing-complete' AND amount_cents=3900))")).rows[0].count,0);
 const applied=(await production.query('SELECT name,sha256 FROM djayvo_migrations ORDER BY name')).rows;assert.equal(applied.length,30);
 for(const row of applied)assert.equal(createHash('sha256').update(await readFile(root+'apps/site/migrations/'+row.name)).digest('hex'),row.sha256);
 report.before=before;report.migrationHashes={};for(const name of expected)report.migrationHashes[name]=createHash('sha256').update(await readFile(root+'apps/site/migrations/'+name)).digest('hex');
 command('pg_dump',['--format=custom','--file',backup],{PGHOST:target.hostname,PGPORT:target.port||'5432',PGDATABASE:target.pathname.slice(1),PGUSER:decodeURIComponent(target.username),PGPASSWORD:decodeURIComponent(target.password),PGSSLMODE:'verify-full',PGSSLROOTCERT:'/etc/ssl/cert.pem'});
 await chmod(backup,0o600);report.backup={path:'build-release-followthrough-20261027-pg18-verified/before-0031-0032.dump',bytes:(await stat(backup)).size,sha256:createHash('sha256').update(await readFile(backup)).digest('hex'),mode:'0600'};
 await admin.query(`CREATE DATABASE "${database}"`);created=true;
 command('pg_restore',['--exit-on-error','--no-owner','--no-acl','--host='+socket,'--port=55439','--dbname='+database,backup],{PGPASSWORD:'',PGSSLMODE:'disable'});
 rehearsal=new pg.Pool({...local,database});assert.deepEqual(await state(rehearsal),before);assert.deepEqual(await migrate(rehearsal),expected);assert.deepEqual(await state(rehearsal),before);assert.deepEqual(await migrate(rehearsal),[]);
 report.restore='PASS data restore and migration rehearsal; original roles/ACL not restored';
 assert.deepEqual(await state(production),before,'Customer data changed during rehearsal; inspect before proceeding');
 // Existing migrator enforces explicit direct-target confirmation and transactional hash checks.
 const run=spawnSync(process.execPath,['--import','tsx','scripts/migrate.ts','--apply'],{cwd:root+'apps/site',env:{...process.env,JAMLOOM_MIGRATION_TARGET:target.host+target.pathname},encoding:'utf8',timeout:60000});
 assert.equal(run.status,0,'Guarded migration failed; inspect database before retrying');
 const after=await state(production);assert.deepEqual(after,before);assert.equal((await production.query('SELECT count(*)::int AS count FROM djayvo_migrations')).rows[0].count,32);
 for(const name of expected)assert.equal((await production.query('SELECT sha256 FROM djayvo_migrations WHERE name=$1',[name])).rows[0].sha256,report.migrationHashes[name]);
 report.after=after;report.applied=expected;report.status='PASS';
}catch(error){report.status='FAIL';report.error=error.message;throw error;}
finally{await rehearsal?.end();if(created){await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);report.rehearsalDatabaseRemoved=true;}await production.end();await admin.end();if(started){command('pg_ctl',['-D',cluster,'-m','fast','-w','stop'],{});await rm(cluster,{recursive:true});await rm(socket,{recursive:true});report.privatePostgresStoppedAndRemoved=true;}await writeFile(output,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,applied:report.applied,restore:report.restore,backupBytes:report.backup.bytes,customerDataUnchanged:true}));
