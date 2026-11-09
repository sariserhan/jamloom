import './env';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {sendOperationAlert} from '../lib/operations-monitor';
import {createPool} from '../lib/database';
import {syncAppleFinance,confirmApplePayment,type ApplePaymentEvidence} from '../lib/apple-finance';
const args=process.argv.slice(2),env=process.env,url=new URL(env.DATABASE_URL??'');
if(env.JAMLOOM_FINANCE_TARGET!==url.host+url.pathname)throw Error('Financial database target confirmation missing');
if(!(args.length===1&&args[0]==='--sync'||args.length===2&&args[0]==='--confirm-payment'))throw Error('Use --sync or --confirm-payment <reviewed evidence manifest.json>');
const pool=createPool(url.href);
try{
 if(args[0]==='--sync'){
  const now=new Date(),months=Array.from({length:3},(_,n)=>new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-n,1)).toISOString().slice(0,7));
  const config={vendor:env.JAMLOOM_APPLE_VENDOR_NUMBER??'',keyID:env.JAMLOOM_APPLE_FINANCE_KEY_ID??'',issuerID:env.JAMLOOM_APPLE_FINANCE_ISSUER_ID??'',
   privateKey:await readFile(env.JAMLOOM_APPLE_FINANCE_PRIVATE_KEY_PATH??'','utf8'),products:JSON.parse(env.JAMLOOM_APPLE_FINANCE_PRODUCTS??'{}')};
  console.log(JSON.stringify({at:new Date().toISOString(),reports:await syncAppleFinance(pool,config,months),automaticCashAllocation:false}));
 }else{
  const input=JSON.parse(await readFile(args[1],'utf8')) as ApplePaymentEvidence&{reviewed:boolean;evidenceFile:string};
  if(input.reviewed!==true||input.vendor!==env.JAMLOOM_APPLE_VENDOR_NUMBER)throw Error('Reviewed bank payment evidence for the configured vendor is required');
  const evidence=await readFile(input.evidenceFile);if(!evidence.length||evidence.length>16*1024*1024)throw Error('Invalid bank payment evidence file');
  const evidenceSha256=createHash('sha256').update(evidence).digest('hex');
  if(input.evidenceSha256!==evidenceSha256)throw Error('Bank evidence changed since review');
  console.log(JSON.stringify(await confirmApplePayment(pool,input)));
 }
}catch(error){if(args[0]==='--sync')await sendOperationAlert('apple-finance-read-failed');throw error;}finally{await pool.end();}
