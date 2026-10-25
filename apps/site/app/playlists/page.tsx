import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { accountsConfigured, services } from '../../lib/services';
import {listeningLibrary} from '../../lib/listening-library.server';
import { PlaylistCreate } from '../catalogue/controls';
export const dynamic='force-dynamic';
export default async function Playlists() {
  if(!accountsConfigured())redirect('/account/sign-in');const {auth}=services();
  const session=await auth.api.getSession({headers:await headers()});if(!session?.user.emailVerified)redirect('/account/sign-in');
  const lists=await listeningLibrary().playlists(session.user.id);
  return <section className="track-detail"><h1>Your playlists.</h1><p>Only you can see these collections. Withdrawn tracks disappear from listening.</p><PlaylistCreate/>
    <ul className="library-list">{lists.map(list=><li key={list.id}><Link href={`/playlists/${list.id}`}>{list.title}</Link></li>)}</ul><Link href="/community">Explore Community</Link></section>;
}
