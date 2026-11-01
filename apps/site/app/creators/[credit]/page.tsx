import {LanguageCollection} from '../../language-filter';
import {publicCredit} from '../../../lib/listening';
import {notFound} from 'next/navigation';
import Link from 'next/link';
import {accountsConfigured,services} from '../../../lib/services';
import {PlayTrack,FavoriteTrack} from '../../player';
export const dynamic='force-dynamic';
export default async function Creator({params,searchParams}:{params:Promise<{credit:string}>;searchParams:Promise<{after?:string}>}){const credit=publicCredit((await params).credit);if(!credit||!accountsConfigured())notFound();const catalogue=services().catalogue;if(!catalogue)notFound();const {after=''}=await searchParams;let result;try{result=await catalogue.list('','','',after,credit);}catch{notFound();}return <section><Link prefetch={false} href="/community">← Community</Link><p className="eyebrow">Public artist credit</p><h1>{credit}</h1><p>Music published under this chosen credit. Credits are not verified identities.</p><LanguageCollection as="ul" className="catalogue-list" items={result.tracks.map(t=>({id:t.id,content:<li key={t.id}><Link prefetch={false} href={'/catalogue/'+t.id}>{t.title}</Link><PlayTrack track={t} queue={result.tracks}/><FavoriteTrack track={t}/></li>}))}/>{!result.tracks.length&&<p>No public tracks under this credit yet.</p>}{result.next&&<Link prefetch={false} href={'?after='+result.next}>More music →</Link>}</section>;}
