import test from 'node:test';
import assert from 'node:assert/strict';
import {djTracks,pickTrack,parseDJCommand,transitionTime,type Direction} from '../lib/ai-dj-director';
const direction:Direction={energy:4,mood:'warm',vocals:true};
const fixtures=[3,4,5].map((energy,i)=>({id:'fixture-'+(i+1),title:'Fixture '+i,artist:'Test',url:'/test-'+i,sha256:'a'.repeat(64),energy,mood:'deep' as const,vocal:false,credit:'#test'}));
const bank=[...fixtures,...djTracks,{...fixtures[0],id:'vocal-fixture',vocal:true}];
test('prepared set spaces vocals, avoids recent tracks and follows energy',()=>{
 const history:string[]=[];
 for(let i=0;i<120;i++){
  const track=pickTrack(bank,direction,history,new Set())!;assert.ok(track);
  assert.ok(!history.slice(-3).includes(track.id));
  if(track.vocal){assert.ok(i>=3);assert.ok(history.slice(-3).every(id=>!bank.find(t=>t.id===id)!.vocal));}
  history.push(track.id);
 }
 assert.ok(history.some(id=>bank.find(t=>t.id===id)!.vocal));
 assert.equal(pickTrack(djTracks,{energy:5,mood:'bright',vocals:false},[],new Set())?.id,'black-diamond');
 assert.equal(pickTrack(djTracks,{energy:4,mood:'bright',vocals:false},[],new Set())?.id,'party-sector');
});
test('closing and disabled vocals stay instrumental; failed tracks cannot return',()=>{
 const history=fixtures.map(t=>t.id);
 assert.equal(pickTrack(bank,direction,history,new Set(),true)?.vocal,false);
 assert.equal(pickTrack(bank,{...direction,vocals:false},history,new Set())?.vocal,false);
 assert.equal(pickTrack(djTracks,direction,[],new Set(djTracks.map(t=>t.id))),undefined);
 const only=new Set(djTracks.filter(t=>t.id!=='party-sector').map(t=>t.id));
 assert.equal(pickTrack(djTracks,direction,[],only)?.id,'party-sector');
 assert.equal(pickTrack(djTracks,direction,['party-sector'],only),undefined);
});
test('supported commands and ambiguous commands have explicit outcomes',()=>{
 assert.deepEqual(parseDJCommand('more energy'),{kind:'direction',change:{energy:1}});
 assert.deepEqual(parseDJCommand('less energy and no vocals'),{kind:'direction',change:{energy:-1,vocals:false}});
 assert.deepEqual(parseDJCommand('a deeper mood'),{kind:'direction',change:{mood:'deep'}});
 assert.deepEqual(parseDJCommand('wrap it up in ten minutes'),{kind:'finish',seconds:600});
 assert.deepEqual(parseDJCommand('one final track'),{kind:'finish',seconds:null});
 for(const command of ['don’t stop','do not finish','keep the party going'])assert.equal(parseDJCommand(command).kind,'continue');
 for(const command of ['stop now','stop music'])assert.equal(parseDJCommand(command).kind,'stop');
 for(const command of ['no more energy','no more vocals','no vocals and no more energy','more energy but less energy','do not increase energy','finish in 2 seconds','finish in 70 minutes','finish in -10 minutes','finish in two hours','play my favorite artist','x'.repeat(241),''])assert.equal(parseDJCommand(command).kind,'unknown',command);
 assert.equal(parseDJCommand('mix next').kind,'next');assert.equal(parseDJCommand('keep this vibe').kind,'hold');
});
test('transition clock remains future scheduled across an hour of selections',()=>{
 let start=0;
 for(let i=0;i<50;i++){
  const {at,fade}=transitionTime(start,96,120,start+1);assert.equal(at,start+88);assert.equal(fade,8);start=at;
 }
 assert.ok(start>3600);
 assert.deepEqual(transitionTime(0,96,120,3,true),{at:4,fade:8});
 assert.ok(transitionTime(0,96,120,105).at>105);
 assert.throws(()=>transitionTime(0,NaN,120,1));assert.throws(()=>transitionTime(0,96,0,1));
});
test('published sample relay stays closed outside development',async()=>{
 const {GET}=await import('../app/ai-dj/audio/route');
 assert.notEqual(process.env.NODE_ENV,'development');
 assert.equal((await GET(new Request('http://localhost/ai-dj/audio?url=https://example.com/private'))).status,404);
});

test('performance timing and transport follow real loop, slip and reverse positions',async()=>{
 const {loopRegion,voicePosition}=await import('../lib/ai-dj-performance');
 assert.deepEqual(loopRegion(5.2,120,2,80),{start:5,end:6});
 assert.deepEqual(loopRegion(5-1e-12,120,1,80),{start:5,end:5.5});
 assert.throws(()=>loopRegion(1,120,0,80));assert.throws(()=>loopRegion(1,Infinity,4,80));
 assert.equal(voicePosition({at:10,offset:5,rate:1,loop:{start:5,end:6}},12.5,80),5.5);
 assert.equal(voicePosition({at:10,offset:5,rate:-2,loop:null},11,80),3);
 assert.equal(voicePosition({at:10,offset:5,rate:1.12,loop:null},11,80),6.12);
});

test('beat commands preserve negation and reject conflicting instructions',async()=>{
 const {validBeatDirection}=await import('../lib/dj-beat');
 for(const text of ['keep this beat','hold the groove','stay with that rhythm'])assert.deepEqual(parseDJCommand(text),{kind:'beat',change:false});
 for(const text of ['change the beat','different groove','switch this rhythm'])assert.deepEqual(parseDJCommand(text),{kind:'beat',change:true});
 for(const text of ['do not change the beat','keep this beat and change the beat'])assert.equal(parseDJCommand(text).kind,'unknown');
 assert.ok(validBeatDirection({bpm:128,groove:'rolling'}));for(const v of [null,{bpm:128.5,groove:'steady'},{bpm:200,groove:'steady'},{bpm:120,groove:'anything'},{bpm:120,groove:'steady',prompt:'override'}])assert.equal(validBeatDirection(v),false);
});

test('automatic loops reject quiet beats, including silence across the repeat seam',async()=>{
 const {loopHasEnergy}=await import('../lib/ai-dj-performance');const pcm=new Float32Array(8000).fill(.1),buffer={sampleRate:8000,numberOfChannels:1,getChannelData:()=>pcm} as unknown as AudioBuffer,loop={start:0,end:.5};
 assert.equal(loopHasEnergy(buffer,loop),true);pcm.fill(0,1000,3000);assert.equal(loopHasEnergy(buffer,loop),false);
 pcm.fill(.1);pcm.fill(0,0,400);pcm.fill(0,3600,4000);assert.equal(loopHasEnergy(buffer,loop),false);
 pcm.fill(0);assert.equal(loopHasEnergy(buffer,loop),false);
});
