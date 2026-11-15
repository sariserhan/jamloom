// Display refresh only; never use this for playback, leases or billing heartbeats.
// Timed refreshes pause after IDLE_MS without user activity so an unattended open tab
// stops waking the database (Neon scale-to-zero); any interaction refreshes at once.
export const IDLE_MS=5*60000;
const ACTIVITY=['pointerdown','keydown','wheel','touchstart','scroll'] as const;
export function visibleRefresh(refresh:()=>void|Promise<void>,interval=60000,clock=()=>Date.now()){
 let stopped=false,pending=false,last=-Infinity,active=clock();
 const update=async()=>{
  if(stopped||document.hidden||pending||clock()-last<1000)return;
  pending=true;last=clock();
  try{await refresh();}finally{pending=false;}
 };
 const notify=()=>{void update().catch(()=>{});};
 const tick=()=>{if(clock()-active<IDLE_MS)notify();};
 const wake=()=>{const idle=clock()-active>=IDLE_MS;active=clock();if(idle)notify();};
 notify();const timer=interval>0?setInterval(tick,interval):undefined;
 window.addEventListener('focus',notify);window.addEventListener('pageshow',notify);document.addEventListener('visibilitychange',notify);
 for(const e of ACTIVITY)window.addEventListener(e,wake,{passive:true});
 return()=>{stopped=true;clearInterval(timer);window.removeEventListener('focus',notify);window.removeEventListener('pageshow',notify);document.removeEventListener('visibilitychange',notify);for(const e of ACTIVITY)window.removeEventListener(e,wake);};
}
