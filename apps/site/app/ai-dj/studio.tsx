'use client';
import {useEffect,useRef,useState} from 'react';
import {recordingTitle} from '../../../web/set-recording-name.js';
import {DJLibrary} from './library';
import {DJRecording,type DJRecordingControls} from './recording';
import {AIDJPlayer,type DJSnapshot} from '../../lib/ai-dj-player';
import {performancePads} from '../../lib/ai-dj-performance';
import {djTracks,parseDJCommand,type Direction} from '../../lib/ai-dj-director';
const empty:DJSnapshot={status:'idle',message:'Choose your music, then start. Autopilot is an experimental rules baseline.',direction:{energy:4,mood:'deep',vocals:true},master:.65,analysis:null,plan:'Manual control',mode:'together',cross:0,elapsed:0,remaining:null,transitionIn:null,history:[],mixing:false,performance:[],decks:[null,null],peak:0};
const time=(seconds:number)=>`${Math.floor(seconds/60)}:${Math.floor(seconds%60).toString().padStart(2,'0')}`;
const energies=['Warm-up','Steady','Driving','Peak','Full power'];

export function AIDJ({owner=null}:{owner?:string|null}){
 const [state,setState]=useState<DJSnapshot>(empty),[request,setRequest]=useState(''),[reply,setReply]=useState(''),[finishMinutes,setFinishMinutes]=useState('10');
 const [bank,setBank]=useState(djTracks),[importing,setImporting]=useState(false),[sessionName,setSessionName]=useState('');
 const sessionTitle=useRef('');
 const jog=useRef<{index:number;x:number;time:number}|null>(null);
 const player=useRef<AIDJPlayer|null>(null),direction=useRef<Direction>(empty.direction),recording=useRef<DJRecordingControls|null>(null);
 const active=['loading','playing','closing','paused'].includes(state.status),running=['playing','closing'].includes(state.status);
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
  const title=recordingTitle(sessionName);if(!title)return;if(recording.current?.hasTake()){setReply('Download or delete the previous local copy before starting another test set.');return;}sessionTitle.current=title;
  setReply('');document.querySelectorAll('audio,video').forEach(a=>(a as HTMLMediaElement).pause());
  try{if(!player.current){player.current=new AIDJPlayer(snapshot=>{setState(snapshot);if(snapshot.analysis)setBank(rows=>rows.some(t=>t.sha256===snapshot.analysis!.sha256&&!t.analysis)?rows.map(t=>t.sha256===snapshot.analysis!.sha256?{...t,analysis:snapshot.analysis!}:t):rows);if(snapshot.status==='stopped'||snapshot.status==='error')setReply('');},bank);player.current.setDirection(direction.current);player.current.setMaster(state.master);player.current.setMode(state.mode);}void player.current.start(()=>recording.current?.start()??Promise.resolve(false));}
  catch{setReply('Audio could not start. Try a supported browser and press Start set again.');}
 }
 async function pauseOrResume(){
  const current=player.current;if(!current)return;
  try{if(state.status==='paused'){recording.current?.resume();await current.resume();}else{recording.current?.pause();if(player.current===current)await current.pause();}}
  catch{setReply('Playback could not pause or resume. Stop the set and try again.');}
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
  else{player.current?.next();setReply('The next prepared track will enter with a short handoff.');}
 }
 return <div className="ai-dj">
  <header className="aidj-intro"><div><p className="eyebrow">Jamloom AI DJ <span>Playback test</span></p><h1>Your music. Your room.<br/><em>Let the set flow.</em></h1></div><div className="aidj-start"><p>Continuous original generation is in development.<br/>This local preview tests mixing and recording.</p><label className="aidj-name">Party or venue name<input required maxLength={80} value={sessionName} onChange={e=>setSessionName(e.target.value)} disabled={active} placeholder="e.g. Rooftop Friday" aria-describedby="aidj-name-help"/></label><small id="aidj-name-help">Used to name your recording.</small><div className="product-actions"><button className="primary" onClick={start} disabled={active||importing||!bank.length||!recordingTitle(sessionName)}>{state.status==='loading'?'Preparing…':'▶ Start set'}</button><button className="aidj-stop" onClick={()=>{player.current?.stop();setReply('');}} disabled={!active}>■ Stop</button></div></div></header>
  <DJLibrary tracks={bank} disabled={active} onBusy={setImporting} onChange={tracks=>{player.current?.dispose();player.current=null;setState({...empty,direction:direction.current});setBank(tracks);}}/>
  <div className="aidj-session"><span>Playback test · local tracks</span><span>Output: system audio device</span><button disabled={!running&&state.status!=='paused'} onClick={()=>void pauseOrResume()}>{state.status==='paused'?'Resume':'Pause'}</button></div>
  <div className="aidj-topbar"><span className={'aidj-led '+(running?'on':'')}>{state.status==='closing'?'Closing set':state.status==='playing'?'On air':state.status==='loading'?'Preparing':state.status==='paused'?'Paused':'Ready when you are'}</span><span>Set time <b>{time(state.elapsed)}</b></span><span>{state.remaining!==null?`Finish in ${time(state.remaining)}`:state.mode==='auto'?'Autopilot · no automatic repeats':'Manual control'}</span></div>
  <div className="aidj-layout">
   <section className="aidj-console" aria-label="AI DJ decks">
    {[0,1].map(i=>{const deck=state.decks[i];return <article className={'aidj-deck deck-'+i} key={i} aria-label={'Deck '+(i?'B':'A')}>
     <div className="aidj-deck-head"><strong>DECK {i?'B':'A'}</strong><span>{deck?.playing?'PLAYING':deck?'READY':'WAITING'}</span></div>
     <div className="aidj-readout"><h2>{deck?.title??'Your next groove'}</h2><p>{deck?.artist??'Music loads when you start'}</p><div><span>{deck?`${deck.bpm.toFixed(1)} BPM · ${deck.reviewed?'checked':'est.'}`:'— BPM'}</span><span>{deck?.vocal?'VOCAL MOMENT':'PREPARED AUDIO'}</span></div>
      <svg viewBox="0 0 288 60" role="img" aria-label={deck?'Prepared track waveform':'No track loaded'}>{(deck?.wave??Array(96).fill(.04)).map((v,n)=><line key={n} x1={n*3+1} x2={n*3+1} y1={30-v*26} y2={30+v*26}/>)}{deck&&<line className="aidj-playhead" x1={288*deck.position/deck.duration} x2={288*deck.position/deck.duration} y1="0" y2="60"/>}</svg>
      <div className="aidj-clock"><b>{time(deck?.position??0)}</b><span>{deck?time(deck.duration):'—:—'}</span></div>
     </div>
     <div className="aidj-jog-area">
      <div className={'aidj-jog '+(deck?.event?.action==='backspin'?'reversing':'')} role="group" aria-label={'Deck '+(i?'B':'A')+' jog wheel'}
       onPointerDown={e=>{if(state.mode!=='together'||state.mixing||!deck?.playing)return;e.currentTarget.setPointerCapture(e.pointerId);jog.current={index:i,x:e.clientX,time:0};}}
       onPointerMove={e=>{const gesture=jog.current;if(!gesture||gesture.index!==i||Math.abs(e.clientX-gesture.x)<12||performance.now()-gesture.time<250)return;player.current?.pad(i,e.clientX<gesture.x?'jog-back':'jog-forward');gesture.x=e.clientX;gesture.time=performance.now();}}
       onPointerUp={()=>{jog.current=null;}} onPointerCancel={()=>{jog.current=null;}} onLostPointerCapture={()=>{jog.current=null;}}>
       <div className="aidj-jog-ring" style={{transform:`rotate(${deck?.event&&/jog|backspin/.test(deck.event.action)?(deck.position-deck.event.position)*160:deck?.playing?deck.position*24:0}deg)`}} aria-hidden="true"><i/></div>
       <div className="aidj-jog-display"><small>{deck?.event?.by??'DECK '+(i?'B':'A')}</small><b>{deck?.event?.label??(deck?.playing?'ON AIR':'READY')}</b><span>{deck?.loopBeats?`${deck.loopBeats.toFixed(1)} BEAT LOOP`:deck?.rate!==undefined&&deck.rate!==1?`${deck.rate<0?'REVERSE':Math.round((deck.rate-1)*100)+'% NUDGE'}`:'PERFORMANCE'}</span></div>
      </div>
      <div className="aidj-jog-nudge"><button disabled={state.mode!=='together'||state.mixing||!deck?.playing} aria-label={'Nudge deck '+(i?'B':'A')+' backward'} onClick={()=>player.current?.pad(i,'jog-back')}>−</button><span>JOG</span><button disabled={state.mode!=='together'||state.mixing||!deck?.playing} aria-label={'Nudge deck '+(i?'B':'A')+' forward'} onClick={()=>player.current?.pad(i,'jog-forward')}>+</button></div>
     </div>
     <div className="aidj-loop-bar"><span>LOOP / ROLL</span><b>{deck?.loopBeats?deck.loopBeats.toFixed(1)+' beats':'OFF'}</b><button disabled={state.mode!=='together'||state.mixing||!deck?.event} onClick={()=>player.current?.releaseLoop(i)} aria-label={'Release deck '+(i?'B':'A')+' performance'}>Release</button></div>
     <div className="aidj-pads" aria-label={'Deck '+(i?'B':'A')+' performance pads'}>{performancePads.map((pad,n)=><button key={pad.id} className={deck?.event?.action===pad.id?'active':''} aria-pressed={deck?.event?.action===pad.id} aria-label={'Deck '+(i?'B':'A')+' '+pad.label} disabled={state.mode!=='together'||state.mixing||!deck?.playing||!!deck.event} onClick={()=>player.current?.pad(i,pad.id)}><small>{String(n+1).padStart(2,'0')}</small><b>{pad.label}</b><span>{pad.detail}</span></button>)}</div>
     <div className="aidj-deck-foot"><span>{deck?.playing?'● Audio clock linked':'○ Standing by'}</span><span>{deck?.vocal?'A little voice. More groove.':'Room for the groove.'}</span></div>
    </article>})}
    <div className="aidj-mixer"><p className="eyebrow">Mix control</p><div className="aidj-meter" role="meter" aria-label="Output peak" aria-valuemin={0} aria-valuemax={1} aria-valuenow={Math.min(1,state.peak)}>{Array.from({length:12},(_,i)=><span key={i} className={state.peak>(i/12)*.5?'lit':''}/>)}</div>
     <label>Master <output>{Math.round(state.master*100)}%</output><input aria-label="AI DJ master volume" type="range" min="0" max="1" step=".01" value={state.master} onChange={e=>{const master=Number(e.target.value);player.current?player.current.setMaster(master):setState(s=>({...s,master}));}}/></label>
     <div className="aidj-cross"><div><span>A</span><small>Crossfade</small><span>B</span></div><div className="aidj-cross-track"><i style={{left:`${state.cross*100}%`}}/></div></div>
     <div className="aidj-mode" aria-label="DJ mode"><button aria-pressed={state.mode==='auto'} onClick={()=>player.current?player.current.setMode('auto'):setState(s=>({...s,mode:'auto'}))}>Autopilot · baseline</button><button aria-pressed={state.mode==='together'} onClick={()=>player.current?player.current.setMode('together'):setState(s=>({...s,mode:'together'}))}>Take control</button></div>
     <div className="aidj-channel-strips">{[0,1].map(i=>{const deck=state.decks[i],letter=i?'B':'A';return <div className={'aidj-channel channel-'+i} key={i}><strong>{letter}</strong>{(['high','mid','low','filter'] as const).map((control,n)=>{const value=control==='filter'?deck?.filter??0:deck?.eq[2-n]??0;return <label key={control} className="aidj-knob"><span aria-hidden="true" style={{transform:`rotate(${control==='filter'?-135+value*270:value*10}deg)`}}/><small>{control.toUpperCase()}</small><input aria-label={'Deck '+letter+' '+control} type="range" min={control==='filter'?0:-12} max={control==='filter'?1:12} step={control==='filter'?.01:1} value={value} disabled={state.mode!=='together'||state.mixing||!deck?.playing} onChange={e=>player.current?.channel(i,control,Number(e.target.value))}/></label>;})}<label className="aidj-level">LEVEL<input aria-label={'Deck '+letter+' level'} type="range" min="0" max="1" step=".01" value={deck?.level??1} disabled={state.mode!=='together'||state.mixing||!deck?.playing} onChange={e=>player.current?.channel(i,'level',Number(e.target.value))}/></label><div className="aidj-fx-readout">ECHO <b>{Math.round((deck?.echo??0)*100)}%</b></div></div>;})}</div>
     <small>{state.mode==='auto'?'Conservative transitions. Take control at any time.':'Your pads, jog, EQ & FX. Mix next starts a handoff.'}</small>
    </div>
   </section>
   <aside className="aidj-direction" aria-label="Set direction"><p className="eyebrow">Practice selection</p><h2>Where next?</h2>
    <label className="aidj-energy-label">Energy <output>{energies[state.direction.energy-1]}</output><input aria-label="Set energy" type="range" min="1" max="5" step="1" value={state.direction.energy} onChange={e=>change({energy:Number(e.target.value)})}/></label>
    <div className="aidj-energy" aria-hidden="true">{energies.map((label,i)=><span key={label} className={i<state.direction.energy?'on':''} style={{height:16+i*10}}/>)}</div>
    <fieldset><legend>Mood</legend><div className="aidj-moods">{(['warm','bright','deep'] as const).map(mood=><button key={mood} aria-pressed={state.direction.mood===mood} onClick={()=>change({mood})}><span aria-hidden="true">{mood==='warm'?'◒':mood==='bright'?'☀':'◐'}</span>{mood}</button>)}</div></fieldset>
    <label className="aidj-vocals"><input type="checkbox" checked={state.direction.vocals} onChange={e=>change({vocals:e.target.checked})}/><span>Occasional vocal moments<small>Instrumental selections lead the set.</small></span></label>
    <div className="aidj-quick"><button onClick={()=>command('more energy')}>↗ More energy</button><button onClick={()=>command('keep this vibe')}>Keep this vibe</button><button disabled={!running} onClick={()=>command('mix next')}>Mix next →</button></div>
    <form onSubmit={e=>{e.preventDefault();command(request);}}><label htmlFor="aidj-request">Playback command</label><div className="aidj-prompt"><input id="aidj-request" maxLength={240} value={request} onChange={e=>setRequest(e.target.value)} placeholder="Finish in 10 minutes…"/><button type="submit" aria-label="Apply DJ direction">↵</button></div></form>
    <p className="aidj-reply" role="status">{reply||state.message}</p>
    <div className="aidj-ending"><label>Wrap it up<select aria-label="Closing time" value={finishMinutes} onChange={e=>setFinishMinutes(e.target.value)}><option value="track">After this track</option><option value="1">In 1 minute</option><option value="5">In 5 minutes</option><option value="10">In 10 minutes</option><option value="30">In 30 minutes</option></select></label><button disabled={!running} onClick={()=>{player.current?.finish(finishMinutes==='track'?null:Number(finishMinutes)*60);setReply('');}}>Plan the ending ↘</button>{state.remaining!==null&&<button onClick={()=>{player.current?.continue();setReply('');}}>Keep the party going ↗</button>}</div>
   </aside>
  </div>
  <DJRecording owner={owner} title={sessionTitle} player={player} status={state.status} controls={recording}/>
  <section className="aidj-performance-feed" aria-label="Performance history"><strong>LIVE MOVES</strong>{state.performance.length?state.performance.slice(-4).map((event,i)=><span key={event.at+'-'+i}><small>{event.by}</small>{event.label}</span>):<span>Loops · rolls · jog · filter · echo</span>}</section>
  <p className="aidj-explanation" role="status">{state.plan}</p>
  <section className="aidj-plan" aria-label="Set plan"><div><small>NOW</small><strong>{state.decks.find(d=>d?.playing)?.title??'Ready for your first track'}</strong></div><span aria-hidden="true">→</span><div><small>NEXT DIRECTION</small><strong>{energies[state.direction.energy-1]} · {state.direction.mood}</strong></div><span aria-hidden="true">→</span><div><small>{state.remaining!==null?'THE FINISH':'NEXT TRANSITION'}</small><strong>{state.remaining!==null?`About ${time(state.remaining)}`:running&&state.transitionIn!==null?`In ${time(state.transitionIn)}`:'Waiting for Mix next'}</strong></div></section>
  <details className="aidj-notes"><summary>About this baseline & music credits</summary><p>This is a deterministic Autopilot preview, not a trained DJ or original music generator. It plays each selected track once. Reviewed 8-bar instrumental entry/exit phrases can use tempo matching and bass exchange; unknown or incompatible timing uses a short handoff without FX. Tempo changes also change pitch; harmonic matching and automatic vocal/section detection are not qualified.</p><p>Analysis runs locally and caches small metadata by audio hash. Imported files stay in this tab; reselect them after reloading. Peak/RMS attenuation is not a LUFS loudness measurement. Playback pauses when you press Pause and stops when this tab is hidden. Venue/background reliability is not qualified.</p><ul>{bank.filter(t=>!t.local).map(t=><li key={t.id}><a href={t.credit} target="_blank" rel="noreferrer">{t.title} — {t.artist}</a> · CC0 practice music</li>)}</ul><a href="/dj-studio">Open DJ Studio for stems and demonstration capture</a></details>
 </div>;
}
