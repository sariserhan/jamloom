import {PlaylistTracks} from '../tracks';
import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { accountsConfigured, services } from '../../../lib/services';
import {listeningLibrary} from '../../../lib/listening-library.server';
import { PlaylistRemove } from '../../catalogue/controls';
export const dynamic='force-dynamic';
export default async function Playlist({params}:{params:Promise<{id:string}>}) {
  if(!accountsConfigured())redirect('/account/sign-in');const {auth}=services();
  const session=await auth.api.getSession({headers:await headers()});if(!session?.user.emailVerified)redirect('/account/sign-in');
  let list;try{list=await listeningLibrary().playlist(session.user.id,(await params).id);}catch{notFound();}
  return <section><Link href="/playlists">All playlists</Link><h1>{list.title}</h1><p>Private to your account.</p><PlaylistRemove id={list.id}/>
    <PlaylistTracks id={list.id} tracks={list.tracks}/>
    {list.unavailable.length>0&&<><h2>Unavailable tracks</h2><p>These tracks are no longer available for public listening. Remove them to free space in your playlist.</p>
      <ul className="catalogue-list">{list.unavailable.map((item:{kind:string;id:string})=><li key={item.kind+item.id}><span>Unavailable track</span><PlaylistRemove id={list.id} reference={item}/></li>)}</ul></>}
    {!list.tracks.length&&<p>No available tracks in this playlist.</p>}
  </section>;
}
