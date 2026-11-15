import Link from 'next/link';
import type {Metadata} from 'next';
import {pageMetadata,origin} from '../lib/product';
import {homeProducts} from '../lib/home-products';
import {CREATOR_PLAN,TOP_UP,songCreditPrice} from '../lib/credit-catalog';
import {SongGallery} from './music-dna/song-gallery';
import {HomeDemo} from './home-demo';
import './home.css';

const title='Jamloom — AI Song Generator from Your Favorite Music';
const description='Turn your favorite artists and songs into an original AI song with vocals. Press Generate once and get an email when it’s ready. Also: free DJ studio and lessons.';
const base=pageMetadata(title,description,'/');
export const metadata:Metadata={...base,title:{absolute:title}};

const dna=songCreditPrice('music-dna').credits,improvise=songCreditPrice('improvise').credits;
// Plain, quotable answers: shown on the page and published as FAQPage data for search and AI answers.
const faq:[string,string][]=[
 ['What is Jamloom?',`Jamloom is an AI music app. Music DNA turns favorite artists and songs into an original song of about two minutes with AI vocals. Improvise turns a recorded sound into a 30–45 second arrangement. Jamloom also has a free in-browser DJ studio, DJ lessons and a singing course.`],
 ['How long does a song take?','Usually 5–10 minutes when the music studio needs to start, and a few minutes when it is already running. You press Generate once, can keep browsing or close the page, and get an email when your song is ready.'],
 ['How much does it cost?',`A Music DNA song costs ${dna} credits and an Improvise arrangement ${improvise} credits; private songs cost 25% more. ${TOP_UP.credits} credits cost $${TOP_UP.cents/100}, or the Creator plan gives ${CREATOR_PLAN.credits} credits for $${CREATOR_PLAN.cents/100} a month. Credits never expire, and failed songs return their credits.`],
 ['Are my songs private?','Your songs are private unless you choose to share them. Public songs appear in Community; you can remove them at any time.'],
];

export default function Home(){
 const more=homeProducts.filter(p=>!['music-dna','improvise'].includes(p.slug));
 const schema={'@context':'https://schema.org','@graph':[
  {'@type':'Organization','@id':origin+'/#organization',name:'Jamloom',url:origin,logo:origin+'/studio/icon.svg',email:'support@jamloom.com'},
  {'@type':'WebSite','@id':origin+'/#website',name:'Jamloom',url:origin,publisher:{'@id':origin+'/#organization'}},
  {'@type':'FAQPage',mainEntity:faq.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))},
 ]};
 return <div className="home">
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>

  <section className="home-hero" aria-labelledby="home-title">
   <div className="home-hero-copy">
    <h1 id="home-title">Turn the songs you love into <span>a song that’s yours.</span></h1>
    <p className="home-lede">Jamloom is an AI song generator. Add a few favorite artists or songs, press Generate once, and get an original song with AI vocals — in your language.</p>
    <div className="home-actions">
     <Link prefetch={false} className="primary home-cta" href="/music-dna">Make your song</Link>
     <a className="home-link" href="#songs">Hear songs people made</a>
    </div>
    <p className="home-note">{dna} credits a song · {TOP_UP.credits} credits for ${TOP_UP.cents/100} · We email you when it’s ready</p>
   </div>
   <HomeDemo/>
  </section>

  <section className="home-steps" aria-labelledby="steps-title">
   <h2 id="steps-title">One click. Then go do something else.</h2>
   <ol>
    <li><strong>Pick your favorites</strong><span>Search any artist or song, or bring a YouTube playlist.</span></li>
    <li><strong>Press Generate</strong><span>We start the music studio, then write, compose and sing your song.</span></li>
    <li><strong>Get an email</strong><span>Browse the site or close it. A progress bar follows you, and we email you when it’s ready.</span></li>
   </ol>
  </section>

  <SongGallery id="songs" scope="showcase" title="Songs made with Jamloom" product="music-dna" rows={3}/>

  <section className="home-ways" aria-labelledby="ways-title">
   <h2 id="ways-title">Start from your favorites, or from a sound.</h2>
   <div className="home-way">
    <h3>Music DNA</h3>
    <p>Pick the artists and songs you love. Get an original two-minute song with AI vocals, inspired by their style.</p>
    <Link prefetch={false} href="/music-dna">Make a song from favorites</Link>
   </div>
   <div className="home-way">
    <h3>Improvise</h3>
    <p>Record a hum, a beat or a sentence. Jamloom turns it into a 30–45 second arrangement around your sound.</p>
    <Link prefetch={false} href="/improvise">Make a song from a sound</Link>
   </div>
  </section>

  <section className="home-price" aria-labelledby="price-title">
   <div>
    <h2 id="price-title">Simple credits. They never expire.</h2>
    <p>A Music DNA song is {dna} credits and Improvise is {improvise}; private songs cost 25% more. If a song fails, its credits come back.</p>
   </div>
   <dl>
    <div><dt>Top-up</dt><dd><strong>${TOP_UP.cents/100}</strong> {TOP_UP.credits} credits</dd></div>
    <div><dt>Creator</dt><dd><strong>${CREATOR_PLAN.cents/100}</strong> {CREATOR_PLAN.credits} credits a month</dd></div>
   </dl>
   <Link prefetch={false} className="home-link" href="/pricing">See pricing</Link>
  </section>

  <section className="home-more" aria-labelledby="more-title">
   <h2 id="more-title">More ways to make music</h2>
   <ul>{more.map(p=><li key={p.slug}><Link prefetch={false} href={p.href}><strong>{p.name}</strong><span>{p.description}</span><small>{p.badge}</small></Link></li>)}</ul>
  </section>

  <section className="home-faq" aria-labelledby="faq-title">
   <h2 id="faq-title">Questions</h2>
   {faq.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}
   <p className="home-guides">Guides: <Link href="/learn/make-a-song-from-favorite-music">Make a song from your favorite music</Link> · <Link href="/learn/record-sound-for-ai-song">Record a sound for an AI song</Link> · <Link href="/learn/how-to-become-a-dj">Start learning to DJ</Link> · <Link href="/learn">All guides</Link></p>
  </section>

  <section className="home-close" aria-labelledby="close-title">
   <h2 id="close-title">Your next favorite song doesn’t exist yet.</h2>
   <Link prefetch={false} className="primary home-cta" href="/music-dna">Make your song</Link>
  </section>
 </div>;
}
