export const SONG_CAPACITY_MESSAGE='Song creation is temporarily unavailable. Please try again shortly. Your credits have not been used.';

// Runpod's ready count describes cached, scaled-down workers. Active workers
// stay in running and never enter ready; requiring both makes admission impossible.
// Running is only a placement signal, not proof of a loaded handler or a completed
// song. Keep execution/TTL limits and failed-job credit release independently enforced.
// https://github.com/runpod/runpodctl#waiting-until-a-resource-is-usable
export function hasReadySongWorker(value:unknown){
 const h=value as {jobs?:Record<string,unknown>;workers?:Record<string,unknown>}|null;
 if(!h?.jobs||!h.workers)return false;
 for(const [group,keys] of [[h.jobs,['inQueue','inProgress']],[h.workers,['idle','ready','running','initializing','throttled','unhealthy']]] as const){
  for(const key of keys)if(!Number.isSafeInteger(group[key])||Number(group[key])<0)return false;
 }
 return h.jobs.inQueue===0&&h.jobs.inProgress===0&&
  Number(h.workers.running)>0&&h.workers.initializing===0&&
  h.workers.throttled===0&&h.workers.unhealthy===0;
}
