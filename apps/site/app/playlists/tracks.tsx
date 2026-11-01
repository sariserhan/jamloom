'use client';
import {useState} from 'react';
import Link from 'next/link';
import {LanguageFilter} from '../language-filter';
import {languageMatches} from '../../lib/song-language';
import {STYLE_MATCH_NOTE} from '../../lib/dna-style-note';
import {type ListeningTrack,trackKey} from '../../lib/listening';
import {PlaylistRemove} from '../catalogue/controls';
import {PlayTrack} from '../player';
export function PlaylistTracks({id,tracks}:{id:string;tracks:ListeningTrack[]}){
 const [language,setLanguage]=useState(''),visible=tracks.filter(t=>languageMatches(t.language,language));
 return <><LanguageFilter label="Playlist language" value={language} onChange={setLanguage} languages={tracks.map(t=>t.language)}/>{visible.length>0&&<PlayTrack track={visible[0]} queue={visible}/>}<ul className="catalogue-list">{visible.map(track=><li key={trackKey(track)}><div><Link href={track.href??'/community'}><h2>{track.title}</h2></Link><p>{track.artist}</p>{track.styleMatch==='uncertain'&&<p>{STYLE_MATCH_NOTE}</p>}</div><PlayTrack track={track} queue={visible}/><PlaylistRemove id={id} reference={track}/></li>)}</ul>{language&&!visible.length&&<p role="status">No songs in this language. <button onClick={()=>setLanguage('')}>Show all languages</button></p>}</>;
}
