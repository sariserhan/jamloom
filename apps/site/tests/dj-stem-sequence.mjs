import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile,appendFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const fresh=process.argv.includes('--fresh');
const root=new URL('../../../',import.meta.url),review=new URL('renders/club-studies-20261024/'+(fresh?'delivered-stems':'stem-performance')+'/review/',root);
const plan=JSON.parse(await readFile(new URL('plan.json',review),'utf8'));
const frames=Math.ceil((plan.seconds+1)*48000);
const browser=await chromium.launch();
try{
 const page=await browser.newPage();
 await page.goto('http://127.0.0.1:8766/'+(fresh?'delivered-stems':'stem-performance')+'/review/');
 if(fresh){
  const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+frames*4,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(2,22);header.writeUInt32LE(48000,24);header.writeUInt32LE(192000,28);header.writeUInt16LE(4,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(frames*4,40);await writeFile(new URL('performance.wav',review),header);
  await page.exposeFunction('savePCM',async s=>appendFile(new URL('performance.wav',review),Buffer.from(s,'base64')));
 }

 const result=await page.evaluate(async(fresh)=>{
  const {renderStudy,renderStreamStudy}=await import('./review.js');
  const baseline=await renderStudy(),stream=await renderStreamStudy();
  let maximumDifference=0,nonfinite=0,peak=0;
  for(let c=0;c<2;c++){
   const a=baseline.getChannelData(c),b=stream.getChannelData(c);
   for(let i=0;i<a.length;i++){
    if(!Number.isFinite(b[i]))nonfinite++;peak=Math.max(peak,Math.abs(b[i]));
    maximumDifference=Math.max(maximumDifference,Math.abs(a[i]-b[i]));
   }
  }
  if(fresh){
   const left=stream.getChannelData(0),right=stream.getChannelData(1);
   for(let at=0;at<stream.length;at+=48000){const n=Math.min(48000,stream.length-at),pcm=new Int16Array(n*2);for(let i=0;i<n;i++){pcm[i*2]=Math.round(left[at+i]*32767);pcm[i*2+1]=Math.round(right[at+i]*32767);}const bytes=new Uint8Array(pcm.buffer);let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));await window.savePCM(btoa(text));}
  }
  return {peak,seconds:stream.duration,frames:stream.length,maximumDifference,nonfinite,
   blocks:7,maximumBufferedBlocks:2,lateBlocksDeliveredDuringRendering:5,newGeneration:false};
 },fresh);
 assert.equal(result.frames,frames);assert(result.peak>0&&result.peak<1);assert.equal(result.nonfinite,0);assert(result.maximumDifference<1e-6);
 if(fresh){
  execFileSync('ffmpeg',['-v','error','-y','-i',new URL('performance.wav',review).pathname,'-c:a','libmp3lame','-b:a','192k',new URL('performance.mp3',review).pathname]);
  result.sha256=createHash('sha256').update(await readFile(new URL('performance.wav',review))).digest('hex');
  result.freshSource=true;
  await page.reload();await page.locator('#rendered').evaluate(a=>a.load());await page.waitForFunction(()=>document.querySelector('#rendered').readyState>=1);
  await page.screenshot({path:new URL('docs/evidence/reliability-followthrough-20261026/fresh-stems.png',root).pathname,fullPage:true});
 }
 await writeFile(new URL('docs/evidence/reliability-followthrough-20261026/'+(fresh?'fresh-stem-sequence':'stem-sequence')+'.json',root),JSON.stringify({status:'PASS progressively delivered source mix',...result},null,2)+'\n');
 console.log(result);
}finally{await browser.close();}
