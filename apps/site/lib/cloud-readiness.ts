export const SONG_CAPACITY_MESSAGE='Song creation is temporarily unavailable. Please try again shortly. Your credits have not been used.';

// Idle/ready can describe a scaled-down cached image, not an allocated GPU.
// Require a running, ready worker before reserving customer credits.
export function hasReadySongWorker(value:unknown){
 const h=value as {jobs?:Record<string,unknown>;workers?:Record<string,unknown>}|null;
 if(!h?.jobs||!h.workers)return false;
 for(const [group,keys] of [[h.jobs,['inQueue','inProgress']],[h.workers,['idle','ready','running','initializing','throttled','unhealthy']]] as const){
  for(const key of keys)if(!Number.isSafeInteger(group[key])||Number(group[key])<0)return false;
 }
 return h.jobs.inQueue===0&&h.jobs.inProgress===0&&
  Number(h.workers.running)>0&&Number(h.workers.ready)>0;
}
