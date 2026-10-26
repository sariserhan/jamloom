// Display refresh only; never use this for playback, leases or billing heartbeats.
export function visibleRefresh(refresh:()=>void|Promise<void>,interval=60000){
 let stopped=false,pending=false,last=-Infinity;
 const update=async()=>{
  if(stopped||document.hidden||pending||Date.now()-last<1000)return;
  pending=true;last=Date.now();
  try{await refresh();}finally{pending=false;}
 };
 const notify=()=>{void update().catch(()=>{});};
 notify();const timer=interval>0?setInterval(notify,interval):undefined;
 window.addEventListener('focus',notify);window.addEventListener('pageshow',notify);document.addEventListener('visibilitychange',notify);
 return()=>{stopped=true;clearInterval(timer);window.removeEventListener('focus',notify);window.removeEventListener('pageshow',notify);document.removeEventListener('visibilitychange',notify);};
}
