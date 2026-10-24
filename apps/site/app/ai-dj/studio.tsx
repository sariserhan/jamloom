'use client';
import {useEffect,useRef,useState} from 'react';
import {AIDJPlayer,type DJSnapshot} from '../../lib/ai-dj-player';
import {djTracks,parseDJCommand,type Direction} from '../../lib/ai-dj-director';
const empty:DJSnapshot={status:'idle',message:'Choose a mood, then start your set.',direction:{energy:3,mood:'warm',vocals:true},master:.65,mode:'auto',tone:0,echo:0,cross:0,elapsed:0,remaining:null,transitionIn:null,history:[],decks:[null,null],peak:0};
const time=(seconds:number)=>`${Math.floor(seconds/60)}:${Math.floor(seconds%60).toString().padStart(2,'0')}`;
const energies=['Easy','Laid-back','Grooving','Building','Peak'];

export function AIDJ(){
 const [state,setState]=useState<DJSnapshot>(empty),[request,setRequest]=useState(''),[reply,setReply]=useState(''),[finishMinutes,setFinishMinutes]=useState('10');
 const player=useRef<AIDJPlayer|null>(null),direction=useRef<Direction>(empty.direction);
 const active=['loading','playing','closing'].includes(state.status),running=['playing','closing'].includes(state.status);
 useEffect(()=>{
  const hidden=()=>{if(document.hidden)player.current?.stop('Set stopped because this tab was hidden. Press Start set when you return.');};
  const leave=()=>player.current?.stop();
  const other=(event:Event)=>{if(event.target instanceof HTMLMediaElement)player.current?.stop('Set stopped while another player is playing.');};
  document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',leave);document.addEventListener('play',other,true);
  return()=>{document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',leave);document.removeEventListener('play',other,true);player.current?.dispose();player.current=null;};
 },[]);
 function change(value:Partial<Direction>){
  direction.current={...direction.current,...value};setReply('');
  if(player.current)player.current.setDirection(value);else setState(s=>({...s,direction:{...direction.current}}));
 }
 function start(){
  setReply('');document.querySelectorAll('audio,video').forEach(a=>(a as HTMLMediaElement).pause());
  try{if(!player.current){player.current=new AIDJPlayer(snapshot=>{setState(snapshot);if(snapshot.status==='stopped'||snapshot.status==='error')setReply('');});player.current.setDirection(direction.current);player.current.setMaster(state.master);player.current.setMode(state.mode);}void player.current.start();}
  catch{setReply('Audio could not start. Try a supported browser and press Start set again.');}
 }
 function command(text:string){
  const action=parseDJCommand(text);
  if(action.kind==='unknown'){setReply('Try “more energy”, “less vocals”, “a deeper mood”, or “finish in 10 minutes”. I haven’t changed the set.');return;}
  if(action.kind==='direction'){
   const value={...action.change};if(value.energy!==undefined)value.energy=Math.max(1,Math.min(5,direction.current.energy+value.energy));change(value);setReply(running?'Got it. This direction applies to the next selection.':'Got it. Your starting direction is set.');
  }else if(action.kind==='hold'){setReply('Keeping this energy and mood for the next tracks.');}
  else if(action.kind==='stop'){player.current?.stop();setReply('Music stopped.');}
  else if(!running){setReply('Start the set first, then I can change its playback or ending.');}
  else if(action.kind==='finish'){player.current?.finish(action.seconds);setReply(action.seconds===null?'Finishing after this track, with a smooth fade.':'Closing plan set. You can keep the party going at any time.');}
  else if(action.kind==='continue'){player.current?.continue();setReply('Closing plan cancelled.');}
  else{player.current?.next();setReply('The next prepared track will enter on an estimated bar.');}
 }
 return <div className="ai-dj">
  <header className="aidj-intro"><div><p className="eyebrow">Jamloom AI DJ <span>Local preview</span></p><h1>You set the mood.<br/><em>We take the decks.</em></h1></div><div className="aidj-start"><p>Prepared music. No generation charges.</p><div className="product-actions"><button className="primary" onClick={start} disabled={active}>{state.status==='loading'?'Preparing…':'▶ Start set'}</button><button className="aidj-stop" onClick={()=>{player.current?.stop();setReply('');}} disabled={!active}>■ Stop</button></div></div></header>
  <div className="aidj-topbar"><span className={'aidj-led '+(running?'on':'')}>{state.status==='closing'?'Closing set':state.status==='playing'?'On air':state.status==='loading'?'Preparing':'Ready when you are'}</span><span>Set time <b>{time(state.elapsed)}</b></span><span>{state.remaining!==null?`Finish in ${time(state.remaining)}`:'Continuous set · until you stop'}</span></div>
  <div className="aidj-layout">
   <section className="aidj-console" aria-label="AI DJ decks">
    {[0,1].map(i=>{const deck=state.decks[i];return <article className={'aidj-deck deck-'+i} key={i} aria-label={'Deck '+(i?'B':'A')}>
     <div className="aidj-deck-head"><strong>DECK {i?'B':'A'}</strong><span>{deck?.playing?'PLAYING':deck?'READY':'WAITING'}</span></div>
     <div className="aidj-readout"><h2>{deck?.title??'Your next groove'}</h2><p>{deck?.artist??'Music loads when you start'}</p><div><span>{deck?`${deck.bpm} BPM · est.`:'— BPM'}</span><span>{deck?.vocal?'VOCAL MOMENT':'INSTRUMENTAL'}</span></div>
      <svg viewBox="0 0 288 60" role="img" aria-label={deck?'Prepared track waveform':'No track loaded'}>{(deck?.wave??Array(96).fill(.04)).map((v,n)=><line key={n} x1={n*3+1} x2={n*3+1} y1={30-v*26} y2={30+v*26}/>)}{deck&&<line className="aidj-playhead" x1={288*deck.position/deck.duration} x2={288*deck.position/deck.duration} y1="0" y2="60"/>}</svg>
      <div className="aidj-clock"><b>{time(deck?.position??0)}</b><span>{deck?time(deck.duration):'—:—'}</span></div>
     </div>
     <div className="aidj-platter-shell"><div className="aidj-platter" style={{transform:`rotate(${(deck?.position??0)*200}deg)`}} aria-hidden="true"><span><b>{i?'B':'A'}</b><small>JAMLOOM</small></span></div><i aria-hidden="true"/></div>
     <div className="aidj-deck-foot"><span>{deck?.playing?'● Audio clock linked':'○ Standing by'}</span><span>{deck?.vocal?'A little voice. More groove.':'Room for the groove.'}</span></div>
    </article>})}
    <div className="aidj-mixer"><p className="eyebrow">Mix control</p><div className="aidj-meter" role="meter" aria-label="Output peak" aria-valuemin={0} aria-valuemax={1} aria-valuenow={Math.min(1,state.peak)}>{Array.from({length:12},(_,i)=><span key={i} className={state.peak>(i/12)*.5?'lit':''}/>)}</div>
     <label>Master <output>{Math.round(state.master*100)}%</output><input aria-label="AI DJ master volume" type="range" min="0" max="1" step=".01" value={state.master} onChange={e=>{const master=Number(e.target.value);player.current?player.current.setMaster(master):setState(s=>({...s,master}));}}/></label>
     <div className="aidj-cross"><div><span>A</span><small>AI crossfader</small><span>B</span></div><div className="aidj-cross-track"><i style={{left:`${state.cross*100}%`}}/></div></div>
     <div className="aidj-mode" aria-label="DJ mode"><button aria-pressed={state.mode==='auto'} onClick={()=>player.current?player.current.setMode('auto'):setState(s=>({...s,mode:'auto'}))}>Autopilot</button><button aria-pressed={state.mode==='together'} onClick={()=>player.current?player.current.setMode('together'):setState(s=>({...s,mode:'together'}))}>Play together</button></div>
     <label>Tone <output>{state.tone===0?'Balanced':state.tone>0?'More bass':'Brighter'}</output><input aria-label="DJ tone" disabled={state.mode!=='together'||!running} type="range" min="-12" max="12" step="1" value={state.tone} onChange={e=>player.current?.effects(Number(e.target.value),state.echo)}/></label>
     <label>Echo <output>{Math.round(state.echo*100)}%</output><input aria-label="DJ echo" disabled={state.mode!=='together'||!running} type="range" min="0" max=".3" step=".01" value={state.echo} onChange={e=>player.current?.effects(state.tone,Number(e.target.value))}/></label>
     <small>{state.mode==='auto'?'The AI handles the transitions.':'You shape tone & echo. AI keeps mixing.'}</small>
    </div>
   </section>
   <aside className="aidj-direction" aria-label="Set direction"><p className="eyebrow">You direct the room</p><h2>Where next?</h2>
    <label className="aidj-energy-label">Energy <output>{energies[state.direction.energy-1]}</output><input aria-label="Set energy" type="range" min="1" max="5" step="1" value={state.direction.energy} onChange={e=>change({energy:Number(e.target.value)})}/></label>
    <div className="aidj-energy" aria-hidden="true">{energies.map((label,i)=><span key={label} className={i<state.direction.energy?'on':''} style={{height:16+i*10}}/>)}</div>
    <fieldset><legend>Mood</legend><div className="aidj-moods">{(['warm','bright','deep'] as const).map(mood=><button key={mood} aria-pressed={state.direction.mood===mood} onClick={()=>change({mood})}><span aria-hidden="true">{mood==='warm'?'◒':mood==='bright'?'☀':'◐'}</span>{mood}</button>)}</div></fieldset>
    <label className="aidj-vocals"><input type="checkbox" checked={state.direction.vocals} onChange={e=>change({vocals:e.target.checked})}/><span>Occasional vocal moments<small>Instrumental selections lead the set.</small></span></label>
    <div className="aidj-quick"><button onClick={()=>command('more energy')}>↗ More energy</button><button onClick={()=>command('keep this vibe')}>Keep this vibe</button><button disabled={!running} onClick={()=>command('mix next')}>Mix next →</button></div>
    <form onSubmit={e=>{e.preventDefault();command(request);}}><label htmlFor="aidj-request">Tell the DJ</label><div className="aidj-prompt"><input id="aidj-request" maxLength={240} value={request} onChange={e=>setRequest(e.target.value)} placeholder="Finish in 10 minutes…"/><button type="submit" aria-label="Apply DJ direction">↵</button></div></form>
    <p className="aidj-reply" role="status">{reply||state.message}</p>
    <div className="aidj-ending"><label>Wrap it up<select aria-label="Closing time" value={finishMinutes} onChange={e=>setFinishMinutes(e.target.value)}><option value="track">After this track</option><option value="1">In 1 minute</option><option value="5">In 5 minutes</option><option value="10">In 10 minutes</option><option value="30">In 30 minutes</option></select></label><button disabled={!running} onClick={()=>{player.current?.finish(finishMinutes==='track'?null:Number(finishMinutes)*60);setReply('');}}>Plan the ending ↘</button>{state.remaining!==null&&<button onClick={()=>{player.current?.continue();setReply('');}}>Keep the party going ↗</button>}</div>
   </aside>
  </div>
  <section className="aidj-plan" aria-label="Set plan"><div><small>NOW</small><strong>{state.decks.find(d=>d?.playing)?.title??'Ready for your first track'}</strong></div><span aria-hidden="true">→</span><div><small>NEXT DIRECTION</small><strong>{energies[state.direction.energy-1]} · {state.direction.mood}</strong></div><span aria-hidden="true">→</span><div><small>{state.remaining!==null?'THE FINISH':'NEXT TRANSITION'}</small><strong>{state.remaining!==null?`About ${time(state.remaining)}`:running&&state.transitionIn!==null?`In ${time(state.transitionIn)}`:'Starts with your set'}</strong></div></section>
  <details className="aidj-notes"><summary>About this local preview & music credits</summary><p>This version mixes a small prepared bank using built-in direction rules. It does not generate new music or use a language model. Tracks repeat in a long set. Tempo estimates guide transitions; beat grids, harmonic matching and musical quality are not yet verified. Play together controls tone and echo; platters show playback and do not scratch.</p><p>Keep this tab visible. Hiding it, navigating away or an audio interruption stops the set. Venue/background reliability is not qualified.</p><ul>{djTracks.map(t=><li key={t.id}><a href={t.credit} target="_blank" rel="noreferrer">{t.title} — {t.artist}</a>{t.vocal?' · existing published Jamloom example':' · CC0 practice music'}</li>)}</ul></details>
 </div>;
}
