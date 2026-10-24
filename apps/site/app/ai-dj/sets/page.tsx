import {notFound} from 'next/navigation';
import {services} from '../../../lib/services';
import {DJRecordings} from '../../../lib/dj-recordings';
import {djSessionStore} from '../../../lib/dj-session-store';
import '../studio.css';
export const metadata={title:'Party sets · Jamloom AI DJ',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{after?:string}>}){
 if(process.env.NODE_ENV!=='development')notFound();const {after=''}=await searchParams;
 let result:{sets:{id:string;title:string;seconds:number}[];next:string|null}|null=null;try{result=await new DJRecordings(services().pool,djSessionStore()).publicList(after);}catch{}
 return <div className="ai-dj"><p className="eyebrow">Made with Jamloom AI DJ</p><h1>Every party.<br/><em>Its own set.</em></h1><p>Full performances shared by their hosts. Your next party could be here.</p><a className="primary" href="/ai-dj/session">Plan your party →</a>
 {!result?<p role="status">Sets are temporarily unavailable. Please try again shortly.</p>:result.sets.length===0?<p className="aidj-session-summary">No shared sets yet. Original generation is still in development.</p>:<><div className="aidj-public-sets">{result.sets.map(s=><article key={s.id}><span aria-hidden="true">◉</span><h2>{s.title}</h2><p>{Math.max(1,Math.round(s.seconds/60))} min · Full set</p><audio controls preload="none" aria-label={'Play '+s.title} src={'/api/ai-dj/sets/'+s.id+'/audio'}/></article>)}</div><nav aria-label="Set pages">{after&&<a href="/ai-dj/sets">First page</a>}{result.next&&<a href={'/ai-dj/sets?after='+result.next}>More sets →</a>}</nav></>}
 </div>;
}
