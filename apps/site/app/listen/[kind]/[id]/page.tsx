import {notFound} from 'next/navigation';
import Link from 'next/link';
import {publicListeningTrack} from '../../../../lib/public-listening.server';
import {Cover} from '../../../cover';
import {AddToPlaylist} from '../../../catalogue/controls';
import {PlayTrack,FavoriteTrack,QueueTrack} from '../../../player';
import {ShareSong} from '../../../share-song';
import {SongFeedback} from '../../../music-dna/song-feedback';
export const dynamic='force-dynamic';
type Props={params:Promise<{kind:string;id:string}>};
export async function generateMetadata({params}:Props){const {kind,id}=await params,t=await publicListeningTrack(kind,id);return t?{title:t.title,description:`Listen to ${t.title} on Jamloom.`,openGraph:{title:t.title,description:'Made with Jamloom. Find your next repeat.',images:[`/listen/${kind}/${id}/opengraph-image`]},twitter:{card:'summary_large_image' as const}}:{title:'Song unavailable'};}
export default async function Listen({params}:Props){const {kind,id}=await params,t=await publicListeningTrack(kind,id);if(!t)notFound();return <section><Link prefetch={false} href="/community">← Community</Link><div className="song-hero"><Cover id={id} title={t.title}/><div><p className="eyebrow">{kind.replaceAll('-',' ')}</p><h1>{t.title}</h1><p>{t.artist} · {t.mood??'Full DJ performance'}</p><div className="product-actions"><PlayTrack track={t}/><FavoriteTrack track={t}/><QueueTrack track={t}/><AddToPlaylist track={t}/></div><ShareSong track={t}/></div></div>{kind==='music-dna'&&t.artist!=='Jamloom'&&<details><summary>Give feedback on a moment</summary><SongFeedback id={id} account/></details>}<p className="muted">Public listening. No commercial reuse or training permission is granted.</p><Link prefetch={false} className="primary" href="/start">Make your own →</Link></section>;}
