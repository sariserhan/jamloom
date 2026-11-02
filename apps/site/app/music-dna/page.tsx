import {TasteNotebook} from './controls';
import {pageMetadata} from '../../lib/product';
import {SongGallery} from './song-gallery';
export const metadata=pageMetadata('My Music DNA','Add favorite songs and artists, and create an original song with AI singing, lyrics and a full arrangement.','/music-dna');
export default function MusicDNA(){return <div className="music-dna-page"><header className="product-workspace-header"><div><p className="eyebrow">Create a song</p><h1>Music DNA</h1><p>Add your favorite music and choose a language. Your next song starts here.</p></div><a className="secondary" href="#public-songs">Listen to songs ↓</a></header><TasteNotebook/><SongGallery scope="showcase" title="Made with Music DNA"/><div className="dna-collections"><SongGallery scope="mine" title="Your songs"/><SongGallery scope="public" title="Community songs"/></div></div>}
