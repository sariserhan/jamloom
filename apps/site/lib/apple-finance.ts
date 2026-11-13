import {createHash,sign} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import type {Pool} from 'pg';
import {readBody} from './audio-validation';
import {lockGpuFunding} from './gpu-revenue';

export type AppleFinanceConfig={vendor:string;keyID:string;issuerID:string;privateKey:string;products:Record<string,string>};
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const monthOK=(s:string)=>/^20\d{2}-(0[1-9]|1[0-2])$/.test(s);
// Financial reports are quoted tab-separated data, including quoted titles.
export function financeRows(text:string){
 const rows:string[][]=[];let row:string[]=[],field='',quoted=false,closed=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;continue;}
  if(c==='"'&&!field&&!closed){quoted=true;continue;}
  if(c==='\t'||c==='\n'||c==='\r'){
   row.push(field);field='';closed=false;
   if(c!=='\t'){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(s=>s!==''))rows.push(row);row=[];}
  }else{if(closed)throw Error('Invalid quoted financial report');field+=c;}
 }
 if(quoted)throw Error('Truncated financial report');
 if(field||row.length){row.push(field);rows.push(row);}
 if(!rows.length||rows.length>200000)throw Error('Invalid financial report size');
 return rows;
}
function cents(value:string){
 if(!/^-?\d{1,10}(?:\.\d{1,2})?$/.test(value))throw Error('Invalid financial amount');
 const negative=value.startsWith('-'),[whole,decimal='']=value.replace('-','').split('.');
 return (BigInt(whole)*100n+BigInt(decimal.padEnd(2,'0')))*(negative?-1n:1n);
}
export function parseAppleFinance(bytes:Buffer,products:Record<string,string>){
 if(!Object.keys(products).length||Object.entries(products).some(([sku,id])=>!/^com\.jamloom\./.test(sku)||!/^\d{6,18}$/.test(id)))throw Error('Apple financial product binding missing');
 if(bytes.length>16*1024*1024)throw Error('Financial report too large');
 const data=bytes[0]===0x1f&&bytes[1]===0x8b?gunzipSync(bytes,{maxOutputLength:32*1024*1024}):bytes;
 const rows=financeRows(new TextDecoder('utf-8',{fatal:true}).decode(data).replace(/^\uFEFF/,'')),headers=rows.shift()!;
 const names=['Vendor Identifier','Apple Identifier','Quantity','Partner Share','Extended Partner Share','Partner Share Currency','Sale or Return'];
 if(new Set(headers).size!==headers.length||names.some(n=>!headers.includes(n)))throw Error('Unsupported Apple finance columns');
 let net=0n,productRows=0;
 for(const row of rows){
  if(row.length!==headers.length)throw Error('Malformed Apple finance row');
  const get=(n:string)=>row[headers.indexOf(n)],sku=get('Vendor Identifier');
  if(!Object.hasOwn(products,sku)){if(Object.values(products).includes(get('Apple Identifier')))throw Error('Apple financial SKU mismatch');continue;}
  if(get('Apple Identifier')!==products[sku])throw Error('Apple financial product identity mismatch');
  if(get('Partner Share Currency')!=='USD')throw Error('Apple proceeds require actual USD settlement conversion');
  const quantity=get('Quantity');if(!/^-?\d{1,8}$/.test(quantity))throw Error('Invalid Apple quantity');
  const q=BigInt(quantity),unit=cents(get('Partner Share')),total=cents(get('Extended Partner Share')),kind=get('Sale or Return');
  if(unit<0n||q*unit!==total||!['S','R'].includes(kind)||kind==='S'&&q<0n||kind==='R'&&q>0n)throw Error('Apple financial totals do not reconcile');
  net+=total*10000n;productRows++;
 }
 if(net>BigInt(Number.MAX_SAFE_INTEGER)||net<BigInt(Number.MIN_SAFE_INTEGER))throw Error('Apple proceeds out of range');
 return {sha256:hash(data),netMicros:Number(net),productRows};
}
export async function downloadAppleFinance(config:AppleFinanceConfig,month:string,request:typeof fetch=fetch,now=Date.now()){
 if(!/^\d{6,12}$/.test(config.vendor)||!monthOK(month)||!/^\w{10}$/.test(config.keyID)||! /^[a-f0-9-]{36}$/i.test(config.issuerID))throw Error('Invalid Apple financial configuration');
 const enc=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url'),seconds=Math.floor(now/1000);
 const body=enc({alg:'ES256',kid:config.keyID,typ:'JWT'})+'.'+enc({iss:config.issuerID,iat:seconds,exp:seconds+120,aud:'appstoreconnect-v1'});
 const signature=sign('sha256',Buffer.from(body),{key:config.privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url');
 const query=new URLSearchParams({'filter[vendorNumber]':config.vendor,'filter[reportDate]':month,'filter[reportType]':'FINANCIAL','filter[regionCode]':'ZZ'});
 const r=await request('https://api.appstoreconnect.apple.com/v1/financeReports?'+query,{headers:{Authorization:'Bearer '+body+'.'+signature,Accept:'application/a-gzip'},redirect:'error',signal:AbortSignal.timeout(20000)});
 const bytes=await readBody(r.body,16*1024*1024);
 if(r.status===404){
  let errors;try{errors=JSON.parse(bytes.toString()).errors;}catch{throw Error('Invalid Apple report response');}
  if(!Array.isArray(errors)||!errors.length||!errors.every(e=>e.code==='NOT_FOUND'))throw Error('Apple finance report unavailable');
  return {status:errors.every(e=>e.detail==='There were no sales for the date specified.')?'no_sales' as const:'unavailable' as const};
 }
 if(!r.ok){
  // Apple error codes (e.g. FORBIDDEN.REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED) are fixed labels, safe to log.
  let codes='';try{codes=(JSON.parse(bytes.toString()).errors??[]).map((e:any)=>String(e.code)).filter((c:string)=>/^[A-Z_.]{1,80}$/.test(c)).join(',');}catch{}
  throw Error('Apple finance report request failed ('+r.status+(codes?' '+codes:'')+')');
 }
 return {status:'downloaded' as const,...parseAppleFinance(bytes,config.products)};
}
export async function syncAppleFinance(pool:Pool,config:AppleFinanceConfig,months:string[],request:typeof fetch=fetch){
 if(months.length<1||months.length>6||new Set(months).size!==months.length)throw Error('Invalid finance scan range');
 const results=[];
 for(const month of months){
  const report=await downloadAppleFinance(config,month,request),db=await pool.connect();
  try{await db.query('BEGIN');await lockGpuFunding(db);
   if(report.status==='downloaded'){
    // A revised report revokes its old allocation until an operator reconciles
    // the correction. Never silently duplicate or overwrite settled cash.
    await db.query(`INSERT INTO apple_finance_reports(vendor,fiscal_month,region,sha256,net_usd_micros,product_rows)
     VALUES($1,$2,'ZZ',$3,$4,$5) ON CONFLICT(vendor,fiscal_month,region) DO UPDATE SET
     state=CASE WHEN apple_finance_reports.sha256=excluded.sha256 THEN apple_finance_reports.state ELSE 'held' END,
     net_usd_micros=LEAST(apple_finance_reports.net_usd_micros,excluded.net_usd_micros),
     checked_at=now()`,[config.vendor,month,report.sha256,report.netMicros,report.productRows]);
   }else await db.query("UPDATE apple_finance_reports SET state='held',checked_at=now() WHERE vendor=$1 AND fiscal_month=$2",[config.vendor,month]);
   await db.query(`INSERT INTO apple_finance_checks(vendor,fiscal_month,result) VALUES($1,$2,$3)
    ON CONFLICT(vendor,fiscal_month) DO UPDATE SET result=excluded.result,checked_at=now()`,[config.vendor,month,report.status]);
   await db.query('COMMIT');results.push({month,...report});
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }
 return results;
}
export type ApplePaymentEvidence={vendor:string;month:string;reportSha256:string;netPaidMicros:number;paymentReference:string;evidenceSha256:string;settledAt:string};
// Operator-only command: actual bank/payment evidence must be reviewed before
// calling. The financial report itself proves receivables, not a bank payout.
export async function confirmApplePayment(pool:Pool,e:ApplePaymentEvidence,now=Date.now()){
 const settled=Date.parse(e.settledAt);
 if(!/^\d{6,12}$/.test(e.vendor)||!monthOK(e.month)||!Number.isSafeInteger(e.netPaidMicros)||e.netPaidMicros<0||!Number.isFinite(settled)||settled>now||settled<Date.parse(e.month+'-01')||
  ![e.reportSha256,e.evidenceSha256].every(s=>/^[a-f0-9]{64}$/.test(s))||! /^[a-zA-Z0-9_:-]{8,120}$/.test(e.paymentReference))throw Error('Invalid Apple payment evidence');
 const db=await pool.connect();
 try{await db.query('BEGIN');await lockGpuFunding(db);
  const r=(await db.query("SELECT * FROM apple_finance_reports WHERE vendor=$1 AND fiscal_month=$2 AND region='ZZ' FOR UPDATE",[e.vendor,e.month])).rows[0];
  if(!r||r.state==='held'||r.sha256!==e.reportSha256||e.netPaidMicros>Math.max(0,Number(r.net_usd_micros)))throw Error('Apple payment does not match the financial report');
  if((await db.query('SELECT 1 FROM apple_finance_holds LIMIT 1')).rowCount)throw Error('Apple refund reconciliation required');
  if(r.state==='settled'){
   if(Number(r.settled_usd_micros)!==e.netPaidMicros||r.payment_reference!==e.paymentReference||r.payment_evidence_sha256!==e.evidenceSha256||new Date(r.settled_at).getTime()!==settled)throw Error('Apple payment confirmation conflict');
  }else await db.query(`UPDATE apple_finance_reports SET state='settled',settled_usd_micros=$3,payment_reference=$4,payment_evidence_sha256=$5,settled_at=$6
   WHERE vendor=$1 AND fiscal_month=$2 AND region='ZZ'`,[e.vendor,e.month,e.netPaidMicros,e.paymentReference,e.evidenceSha256,new Date(settled)]);
  await db.query('COMMIT');return {status:'settled',allocationMicros:Math.floor(e.netPaidMicros/5)};
 }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
