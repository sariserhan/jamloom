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
