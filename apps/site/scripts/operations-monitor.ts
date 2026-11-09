import './env';
import {createPool} from '../lib/database';
import {runOperations,sendOperationAlert} from '../lib/operations-monitor';
const args=process.argv.slice(2);
if(args.length!==1||!['--apply','--test-alert'].includes(args[0]))throw Error('Use operations-monitor.ts --apply | --test-alert');
if(args[0]==='--test-alert')console.log(JSON.stringify(await sendOperationAlert('test')));
else{
 const url=new URL(process.env.DATABASE_URL??'');
 if(process.env.JAMLOOM_OPERATIONS_TARGET!==url.host+url.pathname)throw Error('Operating database target confirmation missing');
 const pool=createPool(url.href);try{console.log(JSON.stringify(await runOperations(pool)));}finally{await pool.end();}
}
