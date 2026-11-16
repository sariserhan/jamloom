import Link from 'next/link';
import {pageMetadata} from '../../lib/product';

// Search-visible landing page for the in-browser studio (the studio itself lives under /studio/, which robots.txt keeps out of search).
export const metadata=pageMetadata('Free Online Remix of Your Voice or Any Sound — Local Remixes','Record or import a short sound and turn it into instrumental remixes in hip-hop, reggae, funk and more. Free, in your browser, and your audio stays on your device.','/local-remixes');

export default function LocalRemixes(){
 return <article className="product-document">
  <h1>Turn your voice or any sound into a remix. Free.</h1>
  <p>Local Remixes turns a short recording — a hum, a clap, a phrase, a kitchen sound — into instrumental remixes in styles like hip-hop, reggae and funk. It runs in your browser and your audio stays on your device unless you choose to save it online.</p>
  <p className="product-actions"><a className="primary" href="/studio/index.html">Open Local Remixes</a></p>
  <h2>How it works</h2>
  <ol>
   <li>Record a short sound in your browser, or import an audio file.</li>
   <li>Choose a style and let the remix build around your sound.</li>
   <li>Listen, try other styles and download the ones you like.</li>
  </ol>
  <h2>Good to know</h2>
  <ul>
   <li>Free, with no account needed to try it.</li>
   <li>Your recording is processed on your device and isn’t uploaded unless you save it online.</li>
   <li>Musical quality is experimental. For a full song with AI vocals, use <Link href="/improvise">Improvise</Link> (from a sound) or <Link href="/music-dna">Music DNA</Link> (from your favorite artists).</li>
  </ul>
  <p><Link href="/learn/voice-remix">Guide: turn your voice into a song — AI singing or a local remix?</Link></p>
 </article>;
}
