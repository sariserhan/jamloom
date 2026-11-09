import type {Pool} from 'pg';
import {syncAppleFinance} from './apple-finance';
// Hosted scheduler accepts its signing key as a secret, never a workstation path.
export async function syncConfiguredAppleFinance(pool:Pool,env:Record<string,string|undefined>=process.env,now=new Date(),request:typeof fetch=fetch){
 const url=new URL(env.DATABASE_URL??'');
 if(env.JAMLOOM_FINANCE_TARGET!==url.host+url.pathname)throw Error('Financial target confirmation missing');
 const privateKey=env.JAMLOOM_APPLE_FINANCE_PRIVATE_KEY;
 if(!privateKey?.includes('BEGIN PRIVATE KEY'))throw Error('Apple financial signing secret missing');
 const config={vendor:env.JAMLOOM_APPLE_VENDOR_NUMBER??'',keyID:env.JAMLOOM_APPLE_FINANCE_KEY_ID??'',issuerID:env.JAMLOOM_APPLE_FINANCE_ISSUER_ID??'',privateKey,products:JSON.parse(env.JAMLOOM_APPLE_FINANCE_PRODUCTS??'{}')};
 const months=Array.from({length:3},(_,n)=>new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-n,1)).toISOString().slice(0,7));
 return {at:now.toISOString(),reports:await syncAppleFinance(pool,config,months,request),automaticCashAllocation:false};
}
