import {ImproviseCreate} from './create';
import {SongGallery} from '../music-dna/song-gallery';
import {CommunityMusic} from '../community';
import {pageMetadata} from '../../lib/product';
export const metadata=pageMetadata('Improvise — Your sound into a song','Create a song inspired by your words or sound, with AI singing and your actual recording woven into the music.','/improvise');
export default function Improvise(){return <div className="improvise-workspace">
 <header className="product-workspace-header"><div><p className="eyebrow">Record · Choose · Create</p><h1 id="improvise-title">Improvise</h1><p>Turn your words or sound into part of a new song.</p></div><a className="secondary" href="#public-songs">Listen to songs ↓</a></header>
 <ImproviseCreate/>
 <SongGallery scope="showcase" title="Made with Improvise" product="improvise"/>
 <SongGallery scope="mine" title="Your songs" product="improvise"/>
 <SongGallery scope="public" title="Community songs" product="improvise"/>
 <details className="improvise-local"><summary>Looking for your local remixes?</summary><p>The earlier remix tool runs on your device. Open it to make a free local remix or manage mixes you saved in this browser.</p><a className="secondary" href="/studio/index.html">Open local remixes</a></details>
 <CommunityMusic/>
 </div>}
