import test from 'node:test';
import assert from 'node:assert/strict';
import {djTracks,pickTrack,parseDJCommand,transitionTime,validReferenceBank,type Direction} from '../lib/ai-dj-director';
import {inspectPCM} from '../lib/ai-dj-player';
const direction:Direction={energy:4,mood:'warm',vocals:true};
const references=[3,4,5].map((energy,i)=>({id:'blood-club-'+(i+1),title:'Reference '+i,artist:'Local reference',url:'/ai-dj/reference?id=blood-club-'+(i+1),sha256:'a'.repeat(64),energy,mood:'deep' as const,vocal:false,reference:true,credit:'#reference-bank'}));
const bank=[...references,...djTracks];
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
 const history=references.map(t=>t.id);
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
test('PCM analysis rejects silence/invalid samples and estimates synthetic pulse',()=>{
 const rate=8000,data=new Float32Array(rate*8);
 for(let i=0;i<data.length;i+=rate/2)for(let n=0;n<80;n++)data[i+n]=Math.sin(n)*.5;
 const result=inspectPCM(data,rate);assert.ok(Math.abs(result.bpm-120)<=1);assert.equal(result.wave.length,96);assert.ok(result.wave.every(n=>Number.isFinite(n)&&n>=0&&n<=1));
 assert.throws(()=>inspectPCM(new Float32Array(rate),rate),/silent/);
 assert.throws(()=>inspectPCM(new Float32Array([NaN]),rate),/invalid/);
});

test('published sample relay stays closed outside development',async()=>{
 const {GET}=await import('../app/ai-dj/audio/route');
 assert.notEqual(process.env.NODE_ENV,'development');
 assert.equal((await GET(new Request('http://localhost/ai-dj/audio?url=https://example.com/private'))).status,404);
});

test('private reference metadata accepts only three bounded local sample identities',()=>{
 assert.equal(validReferenceBank(references),true);
 for(const tracks of [references.slice(1),[...references.slice(0,2),references[0]],references.map(t=>({...t,url:'https://example.com/audio'})),references.map(t=>({...t,id:'../../private'}))])assert.equal(validReferenceBank(tracks),false);
});

test('performance timing and transport follow real loop, slip and reverse positions',async()=>{
 const {loopRegion,voicePosition,performanceChoice}=await import('../lib/ai-dj-performance');
 assert.deepEqual(loopRegion(5.2,120,2,80),{start:5,end:6});
 assert.throws(()=>loopRegion(1,120,0,80));assert.throws(()=>loopRegion(1,Infinity,4,80));
 assert.equal(voicePosition({at:10,offset:5,rate:1,loop:{start:5,end:6}},12.5,80),5.5);
 assert.equal(voicePosition({at:10,offset:5,rate:-2,loop:null},11,80),3);
 assert.equal(voicePosition({at:10,offset:5,rate:1.12,loop:null},11,80),6.12);
 const actions=new Set(Array.from({length:12},(_,i)=>performanceChoice(i,5,false)));assert.ok(actions.has('backspin')&&actions.has('roll-half')&&actions.has('loop-4'));
 for(let i=0;i<12;i++)assert.ok(['filter','echo'].includes(performanceChoice(i,5,true)));
});
