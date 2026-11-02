import {read,save,control,delay,endpoint} from './deployed-common.mts';
const state=await read('style-control-intent.json');
await save('style-watchdog-ready.json',{pid:process.pid,deadline:state.deadline});
await delay(Math.max(0,state.deadline-Date.now()));
const shutdownDeadline=state.deadline+130000;
while(Date.now()<shutdownDeadline){try{await control('serverless/'+endpoint,{workers:{min:0,max:0},gpu:state.previousGpu},shutdownDeadline-Date.now());await save('style-watchdog-stopped.json',{at:new Date().toISOString()});process.exit(0);}catch{await delay(Math.max(1,Math.min(3000,shutdownDeadline-Date.now())));}}
await save('style-watchdog-failed.json',{at:new Date().toISOString(),remoteRecoveryCronRequired:true});process.exit(1);
