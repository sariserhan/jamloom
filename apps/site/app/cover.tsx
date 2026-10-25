import {coverHue} from '../lib/listening';
export function Cover({id,title}:{id:string;title?:string}){return <div className="song-cover" style={{'--cover-hue':coverHue(id)} as React.CSSProperties} aria-hidden="true"><div className="cover-orbit"/><span>JAMLOOM</span>{title&&<strong>{title}</strong>}</div>;}
