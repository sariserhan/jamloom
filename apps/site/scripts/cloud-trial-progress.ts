// Only poll the active batch: tick can submit a paid provider job.
export function trialBatch<T extends {state?:string;saved?:boolean;pollErrors?:number}>(requests:T[],workers:number):T[]{
 if(!Number.isInteger(workers)||workers<1||workers>2)throw Error('Invalid trial worker bound');
 if(requests.some(r=>r.state==='failed'||r.state==='cancelled'||(r.pollErrors??0)>=3))throw Error('Trial stopped after request failure or repeated polling errors');
 return requests.filter(r=>r.state!=='completed'||!r.saved).slice(0,workers);
}
