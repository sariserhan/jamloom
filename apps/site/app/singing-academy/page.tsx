import {LanguageCollection} from '../language-filter';
import {singingRecordings} from '../../../web/singing-recordings.js';
import {pageMetadata} from '../../lib/product';
import CourseProgress from './CourseProgress';
export const metadata=pageMetadata('Singing Academy: Songs & Practice','Choose a song, sing with a backing track, and follow your pitch and practice progress.','/singing-academy');
export default function SingingAcademy(){return <div className="singing-workspace">
 <header className="product-workspace-header"><div><p className="eyebrow">Learn to sing</p><h1>Singing Academy</h1><p>Choose a song and start singing. Your microphone audio stays on your device.</p></div><a className="secondary" href="/singing-academy/warmups">Notes &amp; warm-ups</a></header>
 <section id="songs" className="product-panel"><p className="eyebrow">Listen &amp; sing</p><h2>Pick your backing track</h2><LanguageCollection className="feature-list" items={singingRecordings.map(song=>({id:song.id,language:song.language,content:<article key={song.id}><div><h3>{song.title}</h3><p>{song.style} · 2 minutes · Recorded singer &amp; karaoke</p></div><a className="primary" href={'/singing-academy/lessons/'+song.id}>Listen &amp; sing →</a></article>}))}/><p className="muted">Open practice with a live pitch display, without a completion grade.</p></section>
 <div id="course"><CourseProgress/></div>
 <details className="product-panel"><summary>Course access and singing practice</summary><p>Browse every song and warm-up. Available previews are free; full-course lessons require course access when sales open. Course purchases are separate from music-generation credits.</p><p>Progress stays in this browser. Choose a comfortable register and stop if singing feels uncomfortable. Feedback checks pitch and timing; it does not assess vocal health or certify singing ability.</p><a href="/singing-academy/checkout">Course &amp; pricing</a></details>
 </div>;}
