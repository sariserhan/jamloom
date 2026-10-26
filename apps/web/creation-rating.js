// Local ratings never upload audio. Online contribution uses the separate cloud-save flow.
export function mountLocalRating(container,sha256,kind='local-remix'){
 if(!/^[a-f0-9]{64}$/.test(sha256)||!['local-remix','local-dj'].includes(kind))throw Error('Invalid local creation');
 const hosted=/^\/(studio\/|ai-dj(?:\/|$))/.test(location.pathname);
 const key='jamloom-creation-rating:'+kind+':'+sha256,box=document.createElement('div'),status=document.createElement('p');status.setAttribute('role','status');
 const label=document.createElement('p');label.textContent='Would you listen again?';box.append(label);
 let rating=null,busy=false;try{const saved=localStorage.getItem(key);if(['like','dislike'].includes(saved))rating=saved;}catch{}
 const buttons=[];
 const update=()=>buttons.forEach(([button,value])=>{button.setAttribute('aria-pressed',String(rating===value));button.disabled=busy;});
 for(const [value,text] of [['like','👍 Like'],['dislike','👎 Needs work']]){const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=text;button.onclick=async()=>{
  if(busy)return;busy=true;update();
  try{localStorage.setItem(key,value);rating=value;status.textContent='Rating saved on this device. Audio was not uploaded.';
   if(hosted){try{const endpoint='/api/creation-feedback?kind='+kind+'&id='+sha256,r=await fetch(endpoint,{signal:AbortSignal.timeout(5000)});if(r.ok){const prior=await r.json();const saved=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({owner:prior.owner,rating:value,tags:[],personalize:false,trainingConsent:false}),signal:AbortSignal.timeout(5000)});if(saved.ok)status.textContent='Rating synced with your account. Audio was not uploaded.';else status.textContent='Rating saved on this device; account sync failed. Tap again to retry.';}}catch{status.textContent='Rating saved on this device; account sync is unavailable.';}}
  }catch{status.textContent='Could not save the rating. Enable device storage and try again.';}finally{busy=false;update();}
 };buttons.push([button,value]);box.append(button);}
 const remove=document.createElement('button');remove.type='button';remove.className='secondary';remove.textContent='Delete rating';remove.onclick=async()=>{if(busy)return;busy=true;update();try{if(hosted){const endpoint='/api/creation-feedback?kind='+kind+'&id='+sha256,prior=await fetch(endpoint,{signal:AbortSignal.timeout(5000)});if(prior.ok){const {owner}=await prior.json();const r=await fetch(endpoint,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({owner}),signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error();}else if(prior.status!==401)throw Error();}localStorage.removeItem(key);rating=null;status.textContent='Rating deleted.';}catch{status.textContent='Deletion could not be confirmed. Please retry.';}finally{busy=false;update();}};box.append(remove,status);
 const note=document.createElement('p');note.className='muted';note.textContent='To contribute audio for training, explicitly save an eligible mix to your cloud library and grant permission there. Local files stay on this device.';box.append(note);container.append(box);update();return box;
}
