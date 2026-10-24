import {vocalSample} from '../../../lib/ai-dj-director';
import {r2AudioStore} from '../../../lib/audio-store';
import {audioResponse,privateHeaders} from '../../../lib/audio-response';
import {musicAudioKey} from '../../../lib/music-storage';
export const runtime='nodejs';
export async function GET(request:Request){
 if(process.env.NODE_ENV!=='development')return new Response(null,{status:404});
 try{
  // One published fixture only: keep signed storage URLs and CORS out of the local audio graph.
  const data=await r2AudioStore().get(musicAudioKey('improvise','public',vocalSample.id,vocalSample.audioSha256),vocalSample.audioBytes);
  return audioResponse(request,{data});
 }catch{return new Response('Prepared sample unavailable',{status:503,headers:privateHeaders});}
}
