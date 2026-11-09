import {comingSoonEnabled} from '../lib/coming-soon';
import {academyLevels} from '../lib/academy-content';
import type {MetadataRoute} from 'next';
import {origin,features} from '../lib/product';
import {information,guides} from '../lib/editorial';
// Read launch configuration at request time, including when promoting a build.
export const dynamic='force-dynamic';
export default function sitemap():MetadataRoute.Sitemap {
 const paths=comingSoonEnabled()?['/','/ai-dj','/pro','/live-dj','/dj-studio','/pricing','/download']:['/','/start','/tour','/community','/ai-dj','/pro','/singing-academy',...features.map(f=>'/'+f.slug),...academyLevels.map(l=>'/academy/levels/'+l.slug),...Object.keys(information).map(p=>'/'+p),'/learn',...Object.keys(guides).map(p=>'/learn/'+p)];
 return [...new Set(paths)].map(path=>({url:origin+path,...(path.startsWith('/learn/')&&guides[path.slice(7)]?.updated?{lastModified:guides[path.slice(7)].updated}: {})}));
}
