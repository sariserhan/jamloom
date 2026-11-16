import {STYLE_MATCH_NOTE} from '../../../../lib/dna-style-note';
import {notFound} from 'next/navigation';
import Link from 'next/link';
import {origin} from '../../../../lib/product';
import {publicListeningTrack} from '../../../../lib/public-listening.server';
import {Cover} from '../../../cover';
import {AddToPlaylist} from '../../../catalogue/controls';
import {PlayTrack,FavoriteTrack,QueueTrack} from '../../../player';
import {ShareSong} from '../../../share-song';
import {SongFeedback} from '../../../music-dna/song-feedback';
export const dynamic='force-dynamic';
type Props={params:Promise<{kind:string;id:string}>};
export async function generateMetadata({params}:Props){const {kind,id}=await params,t=await publicListeningTrack(kind,id);return t?{title:t.title,description:`Listen to ${t.title} on Jamloom.`,openGraph:{title:t.title,description:'Made with Jamloom. Find your next repeat.',images:[`/listen/${kind}/${id}/opengraph-image`]},twitter:{card:'summary_large_image' as const}}:{title:'Song unavailable'};}
export default async function Listen({params}:Props){const {kind,id}=await params,t=await publicListeningTrack(kind,id);if(!t)notFound();return <section><Link prefetch={false} href="/community">← Community</Link><div className="song-hero"><Cover id={id} title={t.title}/><div><p className="eyebrow">{kind.replaceAll('-',' ')}</p><h1>{t.title}</h1><p>{t.artist} · {t.mood??'Full DJ performance'}</p><div className="product-actions"><PlayTrack track={t}/><FavoriteTrack track={t}/><QueueTrack track={t}/><AddToPlaylist track={t}/></div>{t.styleMatch==='uncertain'&&<p>{STYLE_MATCH_NOTE}</p>}{kind!=='sets'&&<p className="listen-cta"><Link prefetch={false} className="primary" href={kind==='improvise'?'/improvise':'/music-dna'}>{kind==='improvise'?'Make your own from a sound':'Make your own from your favorite songs'}</Link></p>}<ShareSong track={t}/></div></div><details><summary>Give feedback on a moment</summary><SongFeedback id={id} product={kind} account/></details><p className="muted">Public listening. No commercial reuse or training permission is granted.</p><Link prefetch={false} className="secondary" href="/start">More ways to make music →</Link><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({'@context':'https://schema.org','@type':'MusicRecording',name:t.title,url:`${origin}/listen/${kind}/${id}`,byArtist:{'@type':'MusicGroup',name:t.artist||'Jamloom'},...(t.language?{inLanguage:t.language}:{}),...(t.mood?{genre:t.mood}:{}),...(t.created?{datePublished:t.created}:{}),publisher:{'@type':'Organization',name:'Jamloom',url:origin}}).replace(/</g,'\\u003c')}}/></section>;}
