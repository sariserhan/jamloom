export type ListeningTrack={id:string;title:string;artist:string;url?:string;href?:string;kind?:string;mood?:string;language?:string;created?:string};
export function audioURL(track:ListeningTrack){
 const url=track.url;
 if(url&&(/^\/api\/(taste|improvise)\/song\?id=[a-f0-9]{32}&file=audio$/.test(url)||/^\/api\/ai-dj\/sets\/[a-f0-9]{32}\/audio$/.test(url)||/^\/api\/aurowall\/[a-f0-9]{24}$/.test(url)))return url;
 return `/api/catalogue/${encodeURIComponent(track.id)}/audio`;
}
export function songTrack(song:{id:string;title:string;language?:string;direction?:string;created_at?:string},kind='music-dna'):ListeningTrack{
 return {...song,artist:'Jamloom Community',kind,mood:song.direction,created:song.created_at,url:`/api/${kind==='improvise'?'improvise':'taste'}/song?id=${song.id}&file=audio`,href:`/listen/${kind}/${song.id}`};
}
export function coverHue(id:string){return [...id].reduce((n,c)=>(n*31+c.charCodeAt(0))%360,0);}
export function readFavorites(raw:string|null):ListeningTrack[]{
 try{const list=JSON.parse(raw??'[]');return Array.isArray(list)?list.slice(0,500).filter(t=>t&&typeof t.id==='string'&&t.id.length<=80&&typeof t.title==='string'&&t.title.length<=200&&typeof t.artist==='string'&&t.artist.length<=100&&(!t.url||typeof t.url==='string')&&(!t.href||/^\/(listen|catalogue)\/[a-zA-Z0-9/-]+$/.test(t.href))):[];}catch{return [];}
}

export function publicCredit(segment:string){try{const credit=decodeURIComponent(segment);return credit.trim()&&credit.length<=80&&!/[\x00-\x1f\x7f]/.test(credit)?credit:null;}catch{return null;}}

export function trackKind(track:ListeningTrack){return track.kind??(/^[a-f0-9]{24}$/.test(track.id)?'aurowall':track.url?.startsWith('/api/improvise/')?'improvise':track.url?.startsWith('/api/taste/')?'music-dna':track.url?.startsWith('/api/ai-dj/')?'sets':track.url?.startsWith('/api/aurowall/')?'aurowall':'catalogue');}
export function trackKey(track:ListeningTrack){return trackKind(track)+':'+track.id;}

export type ListeningPreference={kind:string;id:string;rating:'like'|'dislike'};
// Rank only music already returned by the public feeds; preferences never add private tracks.
export function discoverTracks(tracks:ListeningTrack[],favorites:ListeningTrack[],ratings:ListeningPreference[]=[]){
 const saved=new Set(favorites.map(trackKey)),rated=new Map(ratings.map(r=>[r.kind+':'+r.id,r.rating]));
 const tokens=(t:ListeningTrack)=>new Set((typeof t.mood==='string'?t.mood:'').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>2));
 const liked=[...favorites,...tracks.filter(t=>rated.get(trackKey(t))==='like')];
 const moods=new Set(liked.flatMap(t=>[...tokens(t)])),languages=new Set(liked.map(t=>typeof t.language==='string'?t.language.toLowerCase():undefined).filter(Boolean));
 const score=(t:ListeningTrack)=>[...tokens(t)].filter(w=>moods.has(w)).length*3+(typeof t.language==='string'&&languages.has(t.language.toLowerCase())?1:0);
 const candidates=tracks.filter(t=>!saved.has(trackKey(t))&&rated.get(trackKey(t))!=='dislike');
 candidates.sort((a,b)=>score(b)-score(a)||(b.created??'').localeCompare(a.created??'')||trackKey(a).localeCompare(trackKey(b)));
 // Alternate familiar styles with new discoveries instead of keeping all exposure on one style.
 const familiar=candidates.filter(t=>score(t)>0),fresh=candidates.filter(t=>score(t)===0),result:ListeningTrack[]=[];
 let a=0,b=0;while(a<familiar.length||b<fresh.length){for(let i=0;i<2&&a<familiar.length;i++)result.push(familiar[a++]);if(b<fresh.length)result.push(fresh[b++]);}
 return result;
}
