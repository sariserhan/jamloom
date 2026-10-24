'use client';
import {useEffect,useRef,useState} from 'react';
import {djTracks,type DJTrack} from '../../lib/ai-dj-director';
import {importTrack} from '../../lib/ai-dj-library';
import {saveAnalysis,validReview,type MixReview,type TrackAnalysis} from '../../lib/ai-dj-analysis';
function GridReview({track,save}:{track:DJTrack;save:(a:TrackAnalysis)=>void}){
 const a=track.analysis!;const [bpm,setBpm]=useState(String(a.review?.bpm??a.bpm)),[origin,setOrigin]=useState(String(a.review?.phraseStart??0)),[entry,setEntry]=useState(a.review?String(Math.round((a.review.mixIn-a.review.phraseStart)*a.review.bpm/1920)):'0'),[exit,setExit]=useState(a.review?String(Math.round((a.review.mixOut-a.review.phraseStart)*a.review.bpm/1920)):''),[edges,setEdges]=useState(a.review?.instrumentalEdges??false),[checked,setChecked]=useState(false),[error,setError]=useState('');
 const phrase=1920/Number(bpm),last=Math.max(1,Math.floor((a.duration-Number(origin))/phrase)-1);
 function submit(){const r:MixReview={bpm:Number(bpm),phraseStart:Number(origin),mixIn:Number(origin)+Number(entry)*phrase,mixOut:Number(origin)+Number(exit||last)*phrase,instrumentalEdges:edges};if(!checked||!validReview(r,a.duration)){setError('Check the BPM and phrase start. Leave eight complete bars after the exit point.');return;}save({...a,review:r});setError('Review saved.');}
 return <details><summary>{a.review?'✓ Reviewed mix points':'Review mix points'}</summary><p>Listen and check the grid. Estimates are not verified musical phrases.</p><audio controls preload="none" src={track.url}/><div className="aidj-grid-review">
 <label>BPM<input type="number" min="60" max="180" step=".01" value={bpm} onChange={e=>{setBpm(e.target.value);setChecked(false);}}/></label>
 <label>First phrase (seconds)<input type="number" min="0" max={a.duration} step=".001" value={origin} onChange={e=>{setOrigin(e.target.value);setChecked(false);}}/></label>
 <label>Entry phrase number<input type="number" min="0" step="1" value={entry} onChange={e=>{setEntry(e.target.value);setChecked(false);}}/></label>
 <label>Exit phrase number<input type="number" min="1" max={last} step="1" placeholder={String(last)} value={exit} onChange={e=>{setExit(e.target.value);setChecked(false);}}/></label></div>
 <p>One phrase here is 8 bars in 4/4. Entry: {(Number(origin)+Number(entry)*phrase).toFixed(2)}s · Exit: {(Number(origin)+Number(exit||last)*phrase).toFixed(2)}s.</p>
 <label><input type="checkbox" checked={edges} onChange={e=>setEdges(e.target.checked)}/> These entry and exit phrases are instrumental.</label><label><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/> I checked this tempo and these phrase boundaries.</label>
 <button type="button" disabled={!checked} onClick={submit}>Save reviewed grid</button>{a.review&&<button type="button" onClick={()=>{const {review,...rest}=a;void review;save(rest);}}>Clear review</button>}<p role="status">{error}</p></details>;
}
export function DJLibrary({tracks,disabled,onChange,onBusy}:{tracks:DJTrack[];disabled:boolean;onBusy:(busy:boolean)=>void;onChange:(t:DJTrack[])=>void}){
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');const abort=useRef<AbortController|null>(null),owned=useRef(new Set<string>());
 useEffect(()=>{onBusy(busy);},[busy,onBusy]);
 useEffect(()=>()=>{abort.current?.abort();owned.current.forEach(u=>URL.revokeObjectURL(u));},[]);
 async function add(files:FileList|null){if(!files||!consent||busy||disabled)return;const selected=Array.from(files);if(selected.length+tracks.length>100||selected.reduce((s,f)=>s+f.size,0)>512*1024*1024){setMessage('Choose up to 100 tracks and 512 MB per import.');return;}
  const controller=new AbortController();abort.current=controller;setBusy(true);let context:AudioContext|null=null;const next=[...tracks],failures:string[]=[];
  try{context=new AudioContext({sampleRate:32000});for(const [i,file] of selected.entries()){
   if(controller.signal.aborted)break;setMessage(`Analyzing ${i+1}/${selected.length}: ${file.name}`);
   try{const track=await importTrack(file,context,controller.signal);if(next.some(t=>t.sha256===track.sha256))URL.revokeObjectURL(track.url);else{owned.current.add(track.url);next.push(track);}}catch(error){if(!controller.signal.aborted)failures.push(file.name+': '+(error instanceof Error?error.message:'Could not import'));}
  }
  if(controller.signal.aborted){for(const t of next)if(t.local&&!tracks.some(old=>old.url===t.url)){URL.revokeObjectURL(t.url);owned.current.delete(t.url);}}
  if(!controller.signal.aborted){onChange(next);setMessage(`${next.length-tracks.length} tracks added.${failures.length?' '+failures.join(' · '):' Files stay on this device.'}`);}
  }catch(error){setMessage('Import unavailable: '+(error instanceof Error?error.message:'Could not open audio'));}
  finally{await context?.close().catch(()=>{});if(abort.current===controller){abort.current=null;setBusy(false);}}
 }
 function remove(id:string){const track=tracks.find(t=>t.id===id);if(track?.local){URL.revokeObjectURL(track.url);owned.current.delete(track.url);}onChange(tracks.filter(t=>t.id!==id));}
 return <section className="aidj-library" aria-label="Music library"><div className="aidj-library-heading"><div><p className="eyebrow">Local playback test</p><h2>{tracks.length} tracks ready</h2></div><p>Test mixing with example tracks or your own files. Files stay on this device.</p></div>
 <label><input type="checkbox" checked={consent} disabled={busy||disabled} onChange={e=>setConsent(e.target.checked)}/> I have permission to process and play these files. Importing does not authorize training.</label>
 <div className="aidj-library-actions"><label className="aidj-file">＋ Add local tracks<input aria-label="Add local tracks" type="file" accept="audio/*,.flac,.m4a" multiple disabled={!consent||disabled||busy} onChange={e=>{void add(e.target.files);e.target.value='';}}/></label><button type="button" disabled={disabled||busy} onClick={()=>{owned.current.forEach(u=>URL.revokeObjectURL(u));owned.current.clear();onChange([...djTracks]);}}>Load test tracks</button>{busy&&<button onClick={()=>{abort.current?.abort();setMessage('Import cancelled.');}}>Cancel import</button>}</div>
 <p role="status">{message}</p><details><summary>Tracks & mix-point review</summary><ul>{tracks.map(t=><li key={t.id}><div><strong>{t.title}</strong><span>{t.analysis?`${t.analysis.bpm} BPM estimated · ${Math.round(t.analysis.confidence*100)}% periodicity score`:'Analyzed when prepared'}{t.analysis?.keyEstimate?' · estimated '+t.analysis.keyEstimate:''}</span><label>Energy (your rating)<select aria-label={'Energy for '+t.title} disabled={disabled||busy} value={t.energy} onChange={e=>onChange(tracks.map(item=>item.id===t.id?{...item,energy:Number(e.target.value)}:item))}>{['Warm-up','Steady','Driving','Peak','Full power'].map((label,i)=><option key={label} value={i+1}>{label}</option>)}</select></label><button disabled={disabled||busy} onClick={()=>remove(t.id)} aria-label={'Remove '+t.title}>Remove</button></div>{t.analysis&&!disabled&&!busy&&<GridReview track={t} save={a=>{saveAnalysis(a);onChange(tracks.map(item=>item.id===t.id?{...item,analysis:a}:item));}}/>}</li>)}</ul></details></section>;
}
