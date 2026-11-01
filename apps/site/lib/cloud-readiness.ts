export const SONG_CAPACITY_MESSAGE='Song creation is temporarily unavailable. Please try again shortly. Your credits have not been used.';

// Scaled-down idle workers already have the image; initializing/throttled-only
// capacity cannot reliably serve a request within the fixed product deadline.
export function hasReadySongWorker(value:unknown){
 const h=value as {jobs?:Record<string,unknown>;workers?:Record<string,unknown>}|null;
 if(!h?.jobs||!h.workers)return false;
 for(const [group,keys] of [[h.jobs,['inQueue','inProgress']],[h.workers,['idle','ready','running','initializing','throttled','unhealthy']]] as const){
  for(const key of keys)if(!Number.isSafeInteger(group[key])||Number(group[key])<0)return false;
 }
 return h.jobs.inQueue===0&&h.jobs.inProgress===0&&
  Number(h.workers.idle)+Number(h.workers.ready)+Number(h.workers.running)>0;
}
