import Link from 'next/link';
import {origin} from '../lib/product';
export function SongExplainer({product}:{product:'improvise'|'music-dna'}){
 const improvise=product==='improvise',name=improvise?'Jamloom Improvise':'Jamloom Music DNA';
 const description=improvise?'Turn a recording into a 30–45 second arrangement with AI singing and your selected sound.':'Create a 100–140 second original song guided by your favorite song and artist names.';
 const schema={'@context':'https://schema.org','@type':'SoftwareApplication',name,url:origin+'/'+product,applicationCategory:'MultimediaApplication',operatingSystem:'Web browser',description,publisher:{'@type':'Organization','@id':origin+'/#organization',name:'Jamloom',url:origin+'/about'}};
 return <section className="product-document" aria-labelledby={product+'-how'}><h2 id={product+'-how'}>{improvise?'How to turn a sound into a song':'How to make music from your favorites'}</h2><p>{description} Songs are private by default; you choose whether to share.</p>
  <ol><li>{improvise?'Record or import a sound you have permission to use.':'Add favorite songs and artists, then review the matches.'}</li><li>{improvise?'Choose the musical direction and review your recording.':'Choose a singing language and review the direction. Favorites guide the song without downloading or sampling their recordings.'}</li><li>Sign in, prepare available capacity and confirm the displayed {improvise?'10':'20'}-credit request.</li></ol>
  <p>Musical results vary. Technical failures and cancellations return generation credits. Replaying and downloading an existing result cost no extra credits. Preparation may take time or be temporarily unavailable.</p>
  <nav className="product-actions" aria-label="Creation guides"><Link href={improvise?'/learn/record-sound-for-ai-song':'/learn/make-a-song-from-favorite-music'}>Read the step-by-step guide →</Link><Link href="/learn/ai-music-credits">Understand song credits</Link><Link href="/pricing">Plans and availability</Link></nav>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replaceAll('<','\\u003c')}}/>
 </section>;
}
