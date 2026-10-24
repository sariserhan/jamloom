import {analyzeTrack} from './ai-dj-analysis';
self.onmessage=({data}:{data:{samples:Float32Array;hash:string}})=>{
 try{self.postMessage({analysis:analyzeTrack(data.samples,8000,data.hash)});}catch(error){self.postMessage({error:error instanceof Error?error.message:'Analysis failed'});}
};
