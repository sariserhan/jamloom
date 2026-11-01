'use client';
import {Fragment,useState,type ReactNode} from 'react';
import {languageLabel,languageMatches,languageOptions} from '../lib/song-language';

export function LanguageFilter({value,onChange,languages,label='Language'}:{value:string;onChange:(value:string)=>void;languages:unknown[];label?:string}){
 const options=languageOptions([...languages,...(value?[value]:[])]);
 return <label className="song-language-filter">{label}<select aria-label={label} value={value} onChange={e=>onChange(e.target.value)}><option value="">All languages</option>{options.map(code=><option key={code} value={code}>{languageLabel(code)}</option>)}</select></label>;
}
// Server-rendered song cards remain server content; only the filter owns client state.
export function LanguageCollection({items,className,as='div',label='Song language'}:{items:{id:string;language?:string;content:ReactNode}[];className?:string;as?:'div'|'ul'|'ol';label?:string}){
 const [language,setLanguage]=useState(''),visible=items.filter(item=>languageMatches(item.language,language)),Tag=as;
 return <><LanguageFilter value={language} onChange={setLanguage} languages={items.map(item=>item.language)} label={label}/><Tag className={className}>{visible.map(item=><Fragment key={item.id}>{item.content}</Fragment>)}</Tag>{language&&!visible.length&&<p role="status">No songs in this language. <button className="text-button" onClick={()=>setLanguage('')}>Show all languages</button></p>}</>;
}
