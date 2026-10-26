import './env';
import {writeFile} from 'node:fs/promises';
import {isAbsolute} from 'node:path';
import {createPool} from '../lib/database';
import {creationTrainingSnapshot} from '../lib/creation-feedback';
const [output]=process.argv.slice(2);if(!output||!isAbsolute(output)||process.argv.length!==3)throw Error('Provide one absolute private output path.');
const pool=createPool(process.env.DATABASE_URL!);
try{const snapshot=await creationTrainingSnapshot(pool,process.env.CREDIT_BILLING_MODE==='live');await writeFile(output,JSON.stringify(snapshot,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({eligible:snapshot.records.length,expiresAt:snapshot.expiresAt,trainingStarted:false}));}finally{await pool.end();}
