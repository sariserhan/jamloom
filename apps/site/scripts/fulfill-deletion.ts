import './env';
import {readConfig} from '../lib/config';
import {createPool} from '../lib/database';
import {audioStore} from '../lib/audio-store';
import {djSessionStore} from '../lib/dj-session-store';
import {DJRecordings} from '../lib/dj-recordings';
import {fulfillDeletion} from '../lib/account-purge';

const config=readConfig(),target=new URL(config.databaseURL),identity=target.host+target.pathname;
const [actor,ticket,owner]=process.argv.slice(2).filter(v=>v!=='--apply');
if(!process.argv.includes('--apply')||process.env.JAMLOOM_DELETION_TARGET!==identity){
 console.log(`Review target: ${identity}. Usage: fulfill-deletion.ts ADMIN_ID TICKET_ID OWNER_ID --apply, with JAMLOOM_DELETION_TARGET matching that target. No deletion performed.`);
}else{
 if(!actor||!ticket||!owner)throw Error('Administrator, account-holder ticket and owner IDs are required.');
 const store=audioStore(config);if(!store)throw Error('Audio storage is not configured.');
 const pool=createPool(config.databaseURL);
 try{console.log(JSON.stringify(await fulfillDeletion(pool,store,new DJRecordings(pool,djSessionStore()),actor,ticket,owner)));}
 finally{await pool.end();}
}
