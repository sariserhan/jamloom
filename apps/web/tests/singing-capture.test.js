import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
function capture(){
 let Processor;const messages=[];
 const env={sampleRate:48000,currentFrame:0,AudioWorkletProcessor:class{constructor(){this.port={postMessage:message=>messages.push(message)};}},registerProcessor:(_,p)=>Processor=p};
 runInNewContext(readFileSync(new URL('../singing-capture-worklet.js',import.meta.url),'utf8'),env);
 const processor=new Processor();
 const feed=(value,blocks)=>{for(let i=0;i<blocks;i++){processor.process([[new Float32Array(128).fill(value)]]);env.currentFrame+=128;}};
 return{processor,messages,feed,env};
}
test('capture timestamps the actual last sample and drops queued work without replaying old voice',()=>{
 const {processor,messages,feed}=capture();feed(.1,32);assert.equal(messages.length,1);assert.equal(messages[0].frame,2400);assert.equal(messages[0].samples.length,2048);
 feed(0,32);assert.equal(messages.length,1);processor.port.onmessage({data:'ack'});feed(0,4);
 assert.equal(messages.length,2);assert(messages[1].samples.every(v=>v===0));
 processor.port.onmessage({data:'stop'});assert.equal(processor.process([[new Float32Array(128)]]),false);
});
test('an input interruption requires a fresh complete window before emitting',()=>{
 const {processor,messages,feed,env}=capture();feed(.2,32);processor.port.onmessage({data:'ack'});
 processor.process([]);env.currentFrame+=128;feed(0,15);assert.equal(messages.length,1);
 feed(0,4);assert.equal(messages.length,2);assert(messages[1].samples.every(v=>v===0));
});
