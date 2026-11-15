import Link from 'next/link';
import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {accountsConfigured,services} from '../../lib/services';
import {SongGallery} from '../music-dna/song-gallery';
export const dynamic='force-dynamic';
export const metadata={title:'Your songs',robots:{index:false,follow:false}};
// Every song this account has made, private and public, across the song products.
export default async function MySongs(){
 if(!accountsConfigured())redirect('/account/sign-in');
 const session=await services().auth.api.getSession({headers:await headers()});
 if(!session?.user.emailVerified)redirect('/account/sign-in');
 return <div className="music-dna-page"><p className="eyebrow">Your music</p><h1>Your songs</h1>
  <p>Everything you’ve made, private and public. Private songs are only visible to you. Songs being made appear here when they finish, and the bar at the bottom of the screen follows them while you browse.</p>
  <SongGallery scope="mine" title="Music DNA songs" product="music-dna"/>
  <SongGallery scope="mine" title="Improvise songs" product="improvise"/>
  <div className="product-actions"><Link prefetch={false} className="primary" href="/music-dna">Make a song from your favorites</Link><Link prefetch={false} className="secondary" href="/improvise">Make a song from a sound</Link></div>
 </div>;
}
