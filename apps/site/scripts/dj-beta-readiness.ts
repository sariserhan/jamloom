import './env';
import {djBillingLive} from '../lib/dj-beta-access';
import {createPool} from '../lib/database';
import {readConfig} from '../lib/config';
import {djBetaReadiness} from '../lib/dj-beta-readiness';
// Read-only: never rents, starts, renews or stops a worker.
const pool=createPool(readConfig().databaseURL);
try{console.log(JSON.stringify(await djBetaReadiness(pool,djBillingLive()),null,2));}finally{await pool.end();}
