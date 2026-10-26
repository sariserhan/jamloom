import {pageMetadata} from '../../../lib/product';
import CourseProgress from '../CourseProgress';
export const metadata=pageMetadata('Singing Warm-ups: Notes, Intervals & Rhythm','All Jamloom note drills in one optional section. Warm up, then return to song practice.','/singing-academy/warmups');
export default function Warmups(){return <div className="product-home"><section className="product-panel"><p className="eyebrow">Singing Academy / Optional practice</p><h1>Notes &amp; warm-ups</h1><p>Build confidence with a note, a short phrase or a rhythm. All exercises stay open for repeat practice.</p><a className="primary" href="/singing-academy">Back to songs →</a></section><div id="course"><CourseProgress warmups/></div></div>;}
