import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {analyzeTrack} from '../lib/ai-dj-analysis';
import {validateWav} from '../lib/audio-validation';
const files=process.argv.slice(2);if(!files.length||files.length>16)throw Error('Supply 1–16 canonical qualification WAV files');
const results=[];
for(const file of files){
 if((await stat(file)).size!==11520044)throw Error('Expected a canonical 60-second stereo WAV');
 const audio=await readFile(file),sha256=createHash('sha256').update(audio).digest('hex');
 if(validateWav(audio,audio.length,sha256)!==60000||audio.readUInt32LE(24)!==48000||audio.readUInt16LE(22)!==2||audio.readUInt16LE(34)!==16||audio.toString('ascii',36,40)!=='data')throw Error('Unexpected WAV format');
 const samples=new Float32Array(60*8000);
 for(let i=0;i<samples.length;i++){let sum=0;for(let j=0;j<6;j++)sum+=audio.readInt16LE(44+(i*6+j)*4)/32768;samples[i]=sum/6;}
 const a=analyzeTrack(samples,8000,sha256);results.push({file,sha256,bpm:a.bpm,confidence:a.confidence,grid:a.grid??null,review:a.review??null});
}
console.log(JSON.stringify({kind:'Measured timing, not human phrase review',results},null,2));
