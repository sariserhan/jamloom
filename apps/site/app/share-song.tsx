'use client';
import {useEffect,useRef,useState} from 'react';
import {audioURL,coverHue,type ListeningTrack} from '../lib/listening';
export function ShareSong({track}:{track:ListeningTrack}){
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[video,setVideo]=useState(''),[format,setFormat]=useState('webm'),cancel=useRef<AbortController|null>(null),saved=useRef('');
 useEffect(()=>()=>{cancel.current?.abort();URL.revokeObjectURL(saved.current);},[]);
 const name=track.title.replace(/[^\p{L}\p{N} -]/gu,'').slice(0,60)||'jamloom';
 // 9:16 for TikTok, Reels and Shorts; the call to action sits above the platforms' bottom UI.
 function canvas(){const c=document.createElement('canvas');c.width=720;c.height=1280;return c;}
 function draw(c:HTMLCanvasElement,bars?:Uint8Array){const g=c.getContext('2d')!,W=720,H=1280;
  const gradient=g.createLinearGradient(0,0,0,H);gradient.addColorStop(0,'#10151a');gradient.addColorStop(1,`hsl(${coverHue(track.id)} 55% 28%)`);g.fillStyle=gradient;g.fillRect(0,0,W,H);
  g.strokeStyle='#d4f78a';g.lineWidth=2;for(let i=0;i<6;i++){g.beginPath();g.arc(W/2,330,70+i*34,0,Math.PI*2);g.stroke();}
  g.fillStyle='white';g.textAlign='center';g.font='bold 30px sans-serif';g.fillText('JAMLOOM',W/2,120);
  g.font='bold 54px sans-serif';const words=track.title.split(/\s+/),lines:string[]=[];let line='';
  for(const word of words){if(g.measureText(line+' '+word).width>620&&line){lines.push(line);line=word;}else line+=(line?' ':'')+word;}lines.push(line);
  lines.slice(0,3).forEach((l,n)=>g.fillText(l,W/2,690+n*64));
  g.font='26px sans-serif';g.fillStyle='#d9e3d2';g.fillText('An original AI song',W/2,690+Math.min(lines.length,3)*64+18);
  if(bars){g.fillStyle='#d4f78a';for(let i=0;i<48;i++){const h=Math.max(4,bars[i]/2.2);g.fillRect(84+i*12,960-h/2,7,h);}}
  g.fillStyle='#d4f78a';g.font='bold 30px sans-serif';g.fillText('Make yours from your favorite songs',W/2,1090);
  g.fillStyle='white';g.font='28px sans-serif';g.fillText('jamloom.com',W/2,1138);g.textAlign='start';}
 function download(blob:Blob,extension:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name+'.'+extension;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
 async function clip(){
  if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream){setMessage('Video export is not supported in this browser. You can still share the link or artwork.');return;}
  const mime=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/webm;codecs=vp8,opus','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));if(!mime){setMessage('Video export is unavailable here. Try a desktop browser.');return;}
  setBusy(true);setMessage('Preparing a 15-second vertical video…');const controller=new AbortController();cancel.current=controller;const checkCancelled=()=>{if(controller.signal.aborted)throw Error('Preview cancelled.');};
  const ac=new AudioContext(),a=new Audio(),c=canvas();let stream:MediaStream|undefined,recorder:MediaRecorder|undefined,frame=0;
  const timeout=setTimeout(()=>controller.abort(),40000);
  try{
   await ac.resume();checkCancelled();document.querySelectorAll('audio').forEach(el=>el.pause());a.crossOrigin='anonymous';a.preload='auto';a.src=audioURL(track);
   const source=ac.createMediaElementSource(a),analyser=ac.createAnalyser(),out=ac.createMediaStreamDestination();analyser.fftSize=256;source.connect(analyser);analyser.connect(out);
   await new Promise<void>((resolve,reject)=>{a.oncanplay=()=>resolve();a.onerror=()=>reject(Error('Audio could not load for export.'));controller.signal.addEventListener('abort',()=>reject(Error('Preview cancelled.')),{once:true});a.load();});
   if(controller.signal.aborted)throw Error('Preview cancelled.');
   // Start near the hook rather than a quiet intro.
   if(Number.isFinite(a.duration)&&a.duration>20)a.currentTime=Math.min(30,a.duration*0.3);
   draw(c);stream=c.captureStream(24);out.stream.getAudioTracks().forEach(t=>stream!.addTrack(t));recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:1200000});const chunks:Blob[]=[];
   const finished=new Promise<Blob>((resolve,reject)=>{recorder!.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder!.onstop=()=>resolve(new Blob(chunks,{type:mime}));recorder!.onerror=()=>reject(Error('Video export failed.'));});
   let maximum=0;const bars=new Uint8Array(analyser.frequencyBinCount);function paint(){analyser.getByteFrequencyData(bars);maximum=Math.max(maximum,...bars);draw(c,bars);frame=requestAnimationFrame(paint);}paint();recorder.start();await a.play();checkCancelled();setMessage('Making your preview…');
   await new Promise<void>((resolve,reject)=>{const stop=setTimeout(resolve,15000);a.onended=()=>{clearTimeout(stop);resolve();};controller.signal.addEventListener('abort',()=>{clearTimeout(stop);reject(Error('Preview cancelled.'));},{once:true});});
   recorder.stop();const blob=await finished;checkCancelled();if(!maximum||blob.size<1000)throw Error('No audio could be captured. Share the song link instead.');
   URL.revokeObjectURL(saved.current);saved.current=URL.createObjectURL(blob);setVideo(saved.current);setFormat(mime.startsWith('video/mp4')?'mp4':'webm');setMessage('Your preview is ready. Download it to share.');
  }catch(e){setMessage(e instanceof Error?e.message:'Preview could not be made.');}finally{clearTimeout(timeout);cancelAnimationFrame(frame);a.pause();a.removeAttribute('src');a.load();if(recorder?.state==='recording')recorder.stop();stream?.getTracks().forEach(t=>t.stop());await ac.close();cancel.current=null;setBusy(false);}
 }
 return <div className="song-sharing"><div className="product-actions"><button className="secondary" onClick={async()=>{try{const url=new URL(track.href??`/catalogue/${track.id}`,location.origin).href;if(navigator.share)await navigator.share({title:track.title,url});else{await navigator.clipboard.writeText(url);setMessage('Song link copied.');}}catch{setMessage('Sharing was cancelled or unavailable. Copy this page’s address to share.');}}}>↗ Share song</button><button className="secondary" onClick={()=>{const c=canvas();draw(c);c.toBlob(b=>{if(b)download(b,'png');else setMessage('Artwork could not be exported.');});}}>Download story image</button><button className="secondary" disabled={busy} onClick={clip}>Make a video for TikTok / Reels</button>{busy&&<button className="secondary" onClick={()=>cancel.current?.abort()}>Cancel export</button>}</div><p className="muted">Exports are created on this device. The 15-second vertical video starts at the song’s hook and may pause other music.</p><p role="status">{message}</p>{video&&<div><video controls src={video} className="share-video" preload="metadata"/><a className="primary" href={video} download={`${name}.${format}`}>Download video</a></div>}</div>;
}
