'use client';
import {useRef,useState} from 'react';

// A real Music DNA song and the favorites it came from. The only motion on the page: bars move while it plays.
const SONG='/api/taste/song?id=06d89abd7d194ddf81bbc54af3e9b67f&file=audio';
export function HomeDemo(){
 const audio=useRef<HTMLAudioElement>(null),[playing,setPlaying]=useState(false),[error,setError]=useState('');
 async function toggle(){
  const a=audio.current;if(!a)return;
  if(!a.paused){a.pause();return;}
  try{setError('');await a.play();}catch{setError('This example can’t play right now. Open Music DNA to hear more songs.');}
 }
 return <figure className="home-demo" data-playing={playing}>
  <figcaption className="home-demo-from">
   <span className="home-demo-label">From these favorites</span>
   <span className="home-demo-chips"><span>Soundgarden</span><span>AC/DC</span><span>Metallica</span></span>
  </figcaption>
  <svg className="home-demo-flow" viewBox="0 0 24 40" aria-hidden="true"><path d="M12 2v32m-7-7 7 7 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  <div className="home-demo-song">
   <button type="button" className="home-demo-play" onClick={toggle} aria-label={playing?'Pause Concrete Roots':'Play Concrete Roots, a Music DNA example song'}>
    {playing?<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>
     :<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>}
   </button>
   <div className="home-demo-meta"><span className="home-demo-label">A new original song</span><strong>Concrete Roots</strong><span>AI vocals · Heavy rock · about 2 minutes</span></div>
   <div className="home-demo-bars" aria-hidden="true">{Array.from({length:14},(_,i)=><i key={i} style={{animationDelay:`${-(i*137)%900}ms`}}/>)}</div>
  </div>
  <audio ref={audio} preload="none" src={SONG} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} onError={()=>{setPlaying(false);setError('This example can’t play right now. Open Music DNA to hear more songs.');}}/>
  {error&&<p role="alert" className="home-demo-error">{error}</p>}
 </figure>;
}
