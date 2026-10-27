// Unqualified original-song revisions. Existing released/shared course stays unchanged until listening.
export function revisedSong(song){
 const soul=song.id==='paper-kites';if(!soul&&song.id!=='neon-tide')throw Error('Only the two rejected originals are in this study');
 const words=soul?[
  'Left your coat behind','Rain against the glass','Words we never finished','Still come drifting back',
  'Take the long way','Let the traffic fade','Nothing needs an answer','In this quiet space',
  'We were paper kites','Dancing through the storm','Let the old thread','Fall into the dawn',
  'We were paper kites','Learning how to fall','Hold this little moment','Leave the rest alone',
 ]:[
  'Static in the hallway','Footsteps through the door','Something in the silence','Pulls us ever closer',
  'Wait until it breaks','Leave the rush outside','Follow that small signal','Underneath the neon tide',
  'Stay inside this feeling','Let the night unfold','Move a little closer','Never lose the glow',
  'Stay inside this feeling','Let the rhythm breathe','One more bright horizon','More than we believed',
 ];
 const shapes=soul?[[3,7,5,3],[7,8,7,3],[2,3,7,5],[5,2,0,2],[3,5,7,10],[8,7,3,0],[2,3,5,7],[5,2,0,2],[7,10,7,5],[7,8,7,3],[7,10,7,5],[5,2,0,2],[7,10,7,5],[8,7,3,0],[7,5,3,2],[5,2,0,0]]:
  [[0,3,7,5],[5,8,7,5],[8,7,3,0],[2,7,11,7],[3,5,7,10],[8,7,5,8],[7,8,10,12],[11,7,5,2],[7,10,12,10],[8,7,5,7],[8,12,10,7],[11,7,2,0],[7,10,12,10],[8,7,5,8],[12,10,8,7],[7,5,3,0]];
 const rhythms=soul?[[.5,.5,1,1.5],[1.5,.5,.5,1],[1,.5,.5,1.5],[.5,1,.5,1.5]]:[[.5,.5,1.5,1],[1,.5,1.5,.5],[.5,1,1,1],[1.5,.5,.5,1]];
 const notes=[[null,4]],lyrics=[''];
 if(words.some(line=>line.split(' ').length!==4))throw Error('Each authored line requires four complete words');
 for(let bar=0;bar<16;bar++){
  const pickup=bar%4===0;if(pickup){notes.push([null,.5]);lyrics.push('');}
  for(let i=0;i<4;i++){notes.push([shapes[bar][i],rhythms[bar%4][i]]);lyrics.push(words[bar].split(' ')[i]);}
  if(!pickup){notes.push([null,.5]);lyrics.push('');}
 }
 notes.push([null,4]);lyrics.push('');
 return {...song,minor:true,tempo:soul?92:120,notes,lyrics,lines:words,arrangement:soul?'soul':'electronic',
  chords:soul?[[3,7,10,14],[0,3,7,8],[2,3,7,10],[2,5,8,12]]:[[0,3,7,10],[0,5,8,12],[0,3,7,8],[2,7,11,14]],bassRoots:soul?[0,8,3,10]:[0,5,8,7]};
}

export function revisedScore(song,phrase,root,rate,start,guide){
 if(!['soul','electronic'].includes(song.arrangement))throw Error('Prepared arrangement required');
 const soul=song.arrangement==='soul',beat=phrase[0].duration/4,total=phrase.at(-1).at+phrase.at(-1).duration;
 const first=phrase.find(n=>n.sourceIndex>0),offset=first?Math.max(0,(song.notes.slice(0,first.sourceIndex).reduce((n,r)=>n+r[1],0)-4)/4):0;
 const events=[];let id=30000;
 const note=(at,length,pitch,patch,velocity)=>{if(at>=total)return;const voice=++id;events.push({frame:Math.round((start+at)*rate),command:{type:'note',id:voice,patch,pitch,velocity}},{frame:Math.round((start+Math.min(total,at+length))*rate),command:{type:'off',id:voice}});};
 for(let bar=0;bar<Math.round(total/beat/4);bar++){
  const sourceBar=Math.max(0,bar-1)+offset,chord=sourceBar%4,chorus=sourceBar>=8,bridge=sourceBar>=4&&sourceBar<8;
  const base=bar*4*beat,level=chorus?1:bridge?.7:.85;
  const hit=(b,p,v)=>note(base+b*beat,.07,p,soul?9:10,Math.round(v*level));
  for(const b of soul?[0,1.75,2.5]:[0,1,2,3])hit(b,36,82);
  for(const b of [1,3])hit(b,38,68);
  for(const b of [.5,1.5,2.5,3.5])hit(b,chorus&&b===3.5?46:42,b===1.5?43:32);
  if(sourceBar%4===3)hit(3.75,38,38);
  for(const [b,length,tone,v] of [[0,1.35,0,70],[1.5,.6,7,52],[2.75,.9,0,64]])note(base+b*beat,length*beat,root-24+song.bassRoots[chord]+tone,soul?2:3,Math.round(v*level));
  // Close upper voicings leave the low register to the bass and space around the vocal.
  for(const tone of song.chords[chord])note(base+(soul?.25:.5)*beat,(soul?2.9:1.2)*beat,root-12+tone,1,Math.round(52*level));
  if(chorus)for(const tone of song.chords[chord].slice(0,3))note(base+2.5*beat,.65*beat,root-12+tone,1,37);
  if(soul&&sourceBar%2===1)for(const [b,tone]of [[.75,7],[2.25,10]])note(base+b*beat,.25*beat,Math.max(40,Math.min(79,root+tone)),5,35);
 }
 if(guide)for(const n of phrase)if(n.note!==null)note(n.at,n.duration*.92,n.note,0,76);
 return events.sort((a,b)=>a.frame-b.frame);
}
