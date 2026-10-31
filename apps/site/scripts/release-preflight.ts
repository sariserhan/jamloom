import './env';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {readConfig} from '../lib/config';
import {createPool} from '../lib/database';
import {audioStore} from '../lib/audio-store';
import {djSessionStore} from '../lib/dj-session-store';
import {cloudSongConfig} from '../lib/cloud-song-config';
import {djBillingLive} from '../lib/dj-beta-access';
import {billingReadiness} from '../lib/billing-mode';
import {proBilling} from '../lib/pro-billing';
import {creditSalesQualified,songCreditPrice,NET_MICROS_PER_CREDIT_FLOOR,TARGET_MARGIN_BPS} from '../lib/credit-catalog';
import {creditBilling} from '../lib/stripe-payments';
import {issueProLicense} from '../lib/pro-license';
import {singingOffer} from '../../web/singing-offer.js';

// Configuration only: constructors do not contact providers, rent GPUs or enable sales.
export function releaseConfiguration(env:Record<string,string|undefined>){
 const valid=(check:()=>unknown)=>{try{return Boolean(check());}catch{return false;}};
 const proConfigured=valid(()=>proBilling(env,'live'));
 const creditEnv={...env,CREDIT_BILLING_MODE:'live'};
 const creditsConfigured=valid(()=>creditBilling(creditEnv));
 let cloudCostCapMicros:number|null=null;try{cloudCostCapMicros=cloudSongConfig({...env,JAMLOOM_CLOUD_SONGS_ENABLED:'true'})?.costCapMicros??null;}catch{}
 const cloudPriceCompatibility=(['improvise','music-dna'] as const).map(product=>{
  const credits=songCreditPrice(product).credits,budgetMicros=Math.floor(credits*NET_MICROS_PER_CREDIT_FLOOR*(10000-TARGET_MARGIN_BPS)/10000);
  return {product,credits,budgetMicros,costCapMicros:cloudCostCapMicros,status:cloudCostCapMicros===null?'NOT_CONFIGURED':cloudCostCapMicros<=budgetMicros?'PASS_CAP_ONLY':'FAIL_CAP'};
 });
 return {
  accountConfigured:valid(()=>readConfig(env)),libraryStorageConfigured:valid(()=>audioStore(readConfig(env),env)),
  djRecordingStorageConfigured:valid(()=>djSessionStore(env)),
  cloudPriceCompatibility,
  cloudSongsEnabled:env.JAMLOOM_CLOUD_SONGS_ENABLED==='true',cloudSongConfigValid:valid(()=>!env.JAMLOOM_CLOUD_SONGS_ENABLED||env.JAMLOOM_CLOUD_SONGS_ENABLED==='false'||cloudSongConfig(env)),
  djBillingModeValid:valid(()=>{djBillingLive(env);return true;}),djInvitationsEnabled:env.JAMLOOM_AI_DJ_BETA_ENABLED==='true',
  academy:billingReadiness('live',env),singing:billingReadiness('live',env,'singing-complete'),
  pro:{mode:'live',configured:proConfigured,checkoutEnabled:proConfigured&&proBilling(env,'live').enabled,
   licenseSigningConfigured:valid(()=>issueProLicense('configuration-check',true,env))},
  credits:{mode:'live',configured:creditsConfigured,taxConfigured:/^txcd_[0-9]{8}$/.test(env.CREDIT_STRIPE_TAX_CODE??''),
   checkoutEnabled:creditsConfigured&&creditBilling(creditEnv).enabled,costQualified:creditSalesQualified(env),creatorPriceConfigured:/^price_[A-Za-z0-9]+$/.test(env.CREATOR_STRIPE_LIVE_PRICE_ID??''),creatorPortalConfigured:/^bpc_[A-Za-z0-9]+$/.test(env.CREATOR_STRIPE_LIVE_PORTAL_CONFIGURATION??'')},
  singingPriceUSD:singingOffer.priceCents/100,
 };
}
export function compareMigrations(expected:Map<string,string>,applied:Map<string,string>){
 return {pending:[...expected.keys()].filter(n=>!applied.has(n)),changed:[...expected].filter(([n,h])=>applied.has(n)&&applied.get(n)!==h).map(([n])=>n),unknown:[...applied.keys()].filter(n=>!expected.has(n))};
}
async function main(){
 if(process.argv.slice(2).some(a=>a!=='--database'))throw Error('Use release-preflight.ts [--database]');
 const report:{configuration:ReturnType<typeof releaseConfiguration>;database:unknown;limitations:string[]}={configuration:releaseConfiguration(process.env),database:'NOT RUN',limitations:['Reads this process environment, not deployed configuration','Configured credentials are not provider delivery evidence','No quality, payment, publication or sales approval is inferred']};
 if(process.argv.includes('--database')){
  const pool=createPool(readConfig().databaseURL);
  try{
   const directory=new URL('../migrations/',import.meta.url),expected=new Map<string,string>();
   for(const name of (await readdir(directory)).filter(n=>/^\d+_[a-z_]+\.sql$/.test(n)).sort())expected.set(name,createHash('sha256').update(await readFile(new URL(name,directory))).digest('hex'));
   const client=await pool.connect();
   try{
    await client.query('BEGIN READ ONLY');await client.query("SET LOCAL statement_timeout='5s'");
    const rows=(await client.query('SELECT name,sha256 FROM djayvo_migrations')).rows;
    const schema=compareMigrations(expected,new Map(rows.map(r=>[r.name,r.sha256])));
    const settings=(await client.query('SELECT maintenance,billing_mode FROM site_settings WHERE id=1')).rows[0];
    report.database={status:Object.values(schema).every(v=>!v.length)&&settings?'PASS':'FAIL',applied:rows.length,...schema,settings:settings??null};
   }finally{await client.query('ROLLBACK');client.release();}
  }finally{await pool.end();}
 }
 console.log(JSON.stringify(report,null,2));
 if(typeof report.database==='object'&&report.database!==null&&'status' in report.database&&report.database.status==='FAIL')process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{console.error('Release preflight failed; no changes were made. Check configuration and database access.');process.exitCode=1;});
