import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
function fixture(){
 const nodes=new Map(),timers=new Map(),messages=[];let now=0,next=0,meter,recorder,allowed=true,unwatched=0,modules=0; const blobs=new Map(),listeners=new Set();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{checked:true,pause(){},load(){},removeAttribute(){},addEventListener(){},removeEventListener(){}});return nodes.get(id);};
 const scope={document:{getElementById:node,addEventListener(){}},window:{addEventListener(type,fn){listeners.add(fn);},removeEventListener(type,fn){listeners.delete(fn);}},setTimeout(fn,ms){const id=++next;timers.set(id,{at:now+ms,fn});return id;},clearTimeout(id){timers.delete(id);},resumeAudio:async()=>{},sha256:async()=>"a".repeat(64),URL:{createObjectURL(blob){const url="blob:"+ ++next;blobs.set(url,blob);return url;},revokeObjectURL(url){blobs.delete(url);}},Blob,
  AudioWorkletNode:class{constructor(){meter=this;this.port={postMessage:m=>messages.push(m),close(){}};}connect(){}disconnect(){}},
  MediaRecorder:class{static isTypeSupported(){return true;}constructor(){recorder=this;this.state='inactive';}start(){this.state='recording';}stop(){this.state='inactive';}}
 };
 scope.window.MediaRecorder=scope.MediaRecorder; scope.studioElement=node; scope.onStudioHidden=()=>()=>{unwatched++;};
 const source=fs.readFileSync(new URL('../set-recording.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replaceAll('export ','');
 vm.runInNewContext(source+'\nglobalThis.attach=attachSetRecording;',scope);
 let context={audioWorklet:{addModule:async()=>{modules++;}},createMediaStreamDestination:()=>({stream:{getTracks:()=>[]}}),createGain:()=>({gain:{},connect(){},disconnect(){}})};
 const api=scope.attach({graph(){},context:()=>context,mixer:()=>({meter:{connect(){},disconnect(){}}}),emit(){},canStart:()=>allowed});
 return {api,node,blobs,listeners,get unwatched(){return unwatched;},get modules(){return modules;},get recorder(){return recorder;},allow(value){allowed=value;api.refresh();},newContext(){context={...context};},async complete(){const waiting=api.stop();meter.port.onmessage({data:{type:'stopped',frames:48000,rate:48000,gaps:0,clockStalls:0}});recorder.ondataavailable({data:new Blob(['captured-audio'])});await recorder.onstop();await waiting;},async start(){await node('set-record-start').onclick();meter.port.onmessage({data:{type:'ready'}});},advance(seconds){now+=seconds*1000;for(const [id,t]of timers)if(t.at<=now){timers.delete(id);t.fn();}},sample(seconds){meter.port.onmessage({data:{type:'meter',frames:seconds*48000,rate:48000}});},get state(){return recorder.state;},messages};
}
test('one-hour cap follows captured frames despite a short wall-clock delay',async()=>{
 const h=fixture();await h.start();h.advance(3690);h.sample(3594);assert.equal(h.state,'recording');
 h.advance(6);h.sample(3600);assert.equal(h.state,'inactive');assert.equal(h.messages.at(-1).type,'stop');
});
test('wall-clock safety deadline still stops a stalled recorder',async()=>{
 const h=fixture();await h.start();h.advance(3900);assert.equal(h.state,'inactive');assert.equal(h.messages.at(-1).type,'stop');
});

test('finishing resolves only after the download and receipt are ready',async()=>{
 const h=fixture();await h.start();await h.complete();
 assert.equal(h.node('set-record-player').hidden,false);assert.equal(h.blobs.size,2);
 const details=JSON.parse(await h.blobs.get(h.node('set-record-details').href).text());
 assert.equal(details.seconds,1);assert.equal(details.sha256,'a'.repeat(64));
 assert.equal(h.node('set-record-start').disabled,true);
 h.api.dispose();assert.equal(h.blobs.size,0);assert.equal(h.unwatched,1);assert.equal(h.listeners.size,0);
 assert.equal(h.node('set-record-start').onclick,null);
});
test('permission and playback gate recording; interrupted starts settle',async()=>{
 const h=fixture();h.allow(false);assert.equal(h.node('set-record-start').disabled,true);
 await h.node('set-record-start').onclick();assert.equal(h.recorder,undefined);
 h.allow(true);h.node('set-record-consent').checked=false;await h.node('set-record-start').onclick();assert.equal(h.recorder,undefined);
 h.node('set-record-consent').checked=true;await h.node('set-record-start').onclick();await h.api.stop();
 assert.equal(h.state,'inactive');assert.equal(h.node('set-record-start').disabled,false);
});
test('finalization has a bounded timeout and permits recovery',async()=>{
 const h=fixture();await h.start();const waiting=h.api.stop();h.advance(8);await waiting;
 assert.match(h.node('set-record-status').textContent,/did not finish/);assert.equal(h.node('set-record-start').disabled,false);
});
test('new audio contexts load their own meter and stale failures cannot cancel a new take',async()=>{
 const h=fixture();await h.start();const old=h.recorder;h.node('set-record-delete').onclick();
 h.newContext();await h.start();assert.equal(h.modules,2);old.onerror();assert.equal(h.state,'recording');
 h.api.dispose();
});

test('encoded byte limit discards an oversized take without publishing it',async()=>{
 const h=fixture();await h.start();h.recorder.ondataavailable({data:{size:96*1024*1024+1}});
 assert.equal(h.state,'inactive');assert.equal(h.blobs.size,0);
 assert.match(h.node('set-record-status').textContent,/96 MB safety limit/);
 assert.equal(h.node('set-record-start').disabled,false);
});
