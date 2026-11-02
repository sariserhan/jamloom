import '../apps/site/scripts/env';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createPool} from '../apps/site/lib/database';
export const dir=new URL('./',import.meta.url), endpoint='jl77hn92npt65k';
export const save=async(name:string,data:any)=>writeFile(new URL(name,dir),JSON.stringify(data,(_key,value)=>typeof value==='bigint'?value.toString():value,2)+'\n',{mode:0o600});
export const read=async(name:string)=>JSON.parse(await readFile(new URL(name,dir),'utf8'));
export const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
export async function control(path:string,body?:any,timeoutMs=20000){const r=await fetch('https://api.runpod.io/v2/'+path,{method:body?'PATCH':'GET',headers:{Authorization:'Bearer '+process.env.RUNPOD_API_KEY,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(Math.max(1,Math.min(20000,timeoutMs)))});assert(r.ok,'Provider control HTTP '+r.status);return r.json();}
export async function health(){const r=await fetch('https://api.runpod.ai/v2/'+endpoint+'/health',{headers:{Authorization:'Bearer '+process.env.RUNPOD_API_KEY},signal:AbortSignal.timeout(15000)});assert(r.ok);return r.json();}
export function database(){assert(new URL(process.env.DATABASE_URL!).hostname.endsWith('.neon.tech'));return createPool(process.env.DATABASE_URL!);}
