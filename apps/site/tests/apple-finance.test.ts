import test from 'node:test';import assert from 'node:assert/strict';import {generateKeyPairSync,randomUUID} from 'node:crypto';import {gzipSync} from 'node:zlib';
import {parseAppleFinance,financeRows,downloadAppleFinance,syncAppleFinance,confirmApplePayment} from '../lib/apple-finance';
import {providerReplenishmentPlan} from '../lib/provider-replenishment';import {gpuRevenueBalance} from '../lib/gpu-revenue';
import {createPool} from '../lib/database';import {migrate} from '../lib/migrations';import {Wallet} from '../lib/wallet';
const products={'com.jamloom.creator.monthly':'6829266841','com.jamloom.credits.topup150':'6829266772'};
const header='Vendor Identifier\tApple Identifier\tQuantity\tPartner Share\tExtended Partner Share\tPartner Share Currency\tSale or Return';
const row='com.jamloom.creator.monthly\t6829266841\t2\t24.50\t49.00\tUSD\tS';
const returned='com.jamloom.credits.topup150\t6829266772\t-1\t14.00\t-14.00\tUSD\tR';
const report=(rows=[row,returned])=>gzipSync(Buffer.from([header,...rows].join('\n')));
const key=generateKeyPairSync('ec',{namedCurve:'prime256v1'}).privateKey.export({format:'pem',type:'pkcs8'}).toString();
const config={vendor:'94477248',keyID:'AAAAAAAAAA',issuerID:'11111111-1111-1111-1111-111111111111',privateKey:key,products};
test('Apple reports use exact USD net proceeds, returns, quoted fields and bound product IDs',()=>{
 assert.deepEqual(financeRows('a\t"b\twith\nnewline"\n1\t"a""b"\n'),[['a','b\twith\nnewline'],['1','a"b']]);
 const a=parseAppleFinance(report(),products);assert.equal(a.netMicros,35000000);assert.equal(a.productRows,2);
 assert.equal(parseAppleFinance(report(['other.product\t7777777\t1\t999.00\t999.00\tUSD\tS']),products).netMicros,0);
 for(const mutation of [row.replace('6829266841','7777777'),row.replace('USD','EUR'),row.replace('49.00','49.01'),row.replace('\tS','\tR'),row.replace('24.50','NaN')])assert.throws(()=>parseAppleFinance(report([mutation]),products));
 assert.throws(()=>financeRows('a\t"unfinished'));assert.throws(()=>financeRows('a\t"quoted"junk'));
});
test('Apple client authenticates to fixed host and distinguishes no sales from unavailable and denied access',async()=>{
 const good:any=async(url:string,o:any)=>{assert(url.startsWith('https://api.appstoreconnect.apple.com/v1/financeReports?'));assert.equal(new URL(url).searchParams.get('filter[vendorNumber]'),'94477248');assert.equal(o.redirect,'error');return new Response(new Uint8Array(report()));};
 assert.equal((await downloadAppleFinance(config,'2026-10',good)).status,'downloaded');
 const missing=(detail:string):any=>async()=>Response.json({errors:[{code:'NOT_FOUND',detail}]},{status:404});
 assert.equal((await downloadAppleFinance(config,'2026-10',missing('There were no sales for the date specified.'))).status,'no_sales');
 assert.equal((await downloadAppleFinance(config,'2026-10',missing('Not yet available'))).status,'unavailable');
 await assert.rejects(downloadAppleFinance(config,'2026-10',async()=>new Response('',{status:403})),/403/);
});
test('recharge proposals stay within settled revenue shortfall and never authorize a charge',()=>{
 assert.equal(providerReplenishmentPlan(0,11000000,750000).status,'waiting_for_revenue');
 assert.equal(providerReplenishmentPlan(10000000,1000000,750000).suggestedMicros,0);
 const p=providerReplenishmentPlan(20000000,1000000,750000);assert.equal(p.suggestedMicros,10000000);assert.equal(p.automaticCharge,false);
 assert.equal(providerReplenishmentPlan(20000000,3000000,750000).suggestedMicros,0);
 assert.equal(providerReplenishmentPlan(-1000000,0,750000).suggestedMicros,0);
});
test('Apple financial ledger: report alone cannot fund spending; payment, corrections and refunds conserve funds',async()=>{
 const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');const admin=createPool(url.href),name='jamloom_apple_finance_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;const pool=createPool(url.href);
 try{
  await migrate(pool);let bytes=report();const request:any=async()=>new Response(new Uint8Array(bytes));
  await syncAppleFinance(pool,config,['2026-10'],request);await syncAppleFinance(pool,config,['2026-10'],request);assert.equal(await gpuRevenueBalance(pool),0);
  const payment={vendor:config.vendor,month:'2026-10',reportSha256:parseAppleFinance(bytes,products).sha256,netPaidMicros:34000000,paymentReference:'payment-oct-2026',evidenceSha256:'a'.repeat(64),settledAt:'2026-11-01T00:00:00Z'};
  await assert.rejects(confirmApplePayment(pool,{...payment,netPaidMicros:36000000}),/does not match/);
  await Promise.all([confirmApplePayment(pool,payment),confirmApplePayment(pool,payment)]);assert.equal(await gpuRevenueBalance(pool),6800000);
  await assert.rejects(confirmApplePayment(pool,{...payment,netPaidMicros:33000000}),/conflict/);
  bytes=report([row]);await syncAppleFinance(pool,config,['2026-10'],request);assert.equal(await gpuRevenueBalance(pool),0,'Changed report holds old funds');
  await assert.rejects(confirmApplePayment(pool,payment),/does not match/);
  bytes=report([row]);await syncAppleFinance(pool,config,['2026-09'],request);
  await confirmApplePayment(pool,{...payment,month:'2026-09',reportSha256:parseAppleFinance(bytes,products).sha256,paymentReference:'payment-sep-2026'});assert.equal(await gpuRevenueBalance(pool),6800000);
  bytes=report([returned]);await syncAppleFinance(pool,config,['2026-11'],request);assert.equal(await gpuRevenueBalance(pool),4000000,'Returns immediately reduce spending room');
  await new Wallet(pool,true).freezePurchase('apple_live','verified-refund-before-grant');assert.equal(await gpuRevenueBalance(pool),-2800000,'Live Apple refund holds all positive Apple funding pending reconciliation');
  assert.equal(Number((await pool.query('SELECT count(*) n FROM apple_finance_reports')).rows[0].n),3);
 }finally{await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();}
});
