import {notFound} from 'next/navigation';
import Link from 'next/link';
import {guides} from '../../../lib/editorial';
import {pageMetadata,origin} from '../../../lib/product';
export const dynamicParams=false;
export function generateStaticParams(){return Object.keys(guides).map(slug=>({slug}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const g=guides[slug];return g?pageMetadata(g.title,g.description,'/learn/'+slug):{};}
export default async function Guide({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params,g=guides[slug];if(!g)notFound();
 const url=origin+'/learn/'+slug,related=g.related??['how-to-become-a-dj','laptop-dj','voice-remix'].filter(id=>id!==slug);
 const schema={'@context':'https://schema.org','@graph':[
  {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Learn',item:origin+'/learn'},{'@type':'ListItem',position:2,name:g.title,item:url}]},
  {'@type':'Article',headline:g.title,description:g.description,mainEntityOfPage:url,inLanguage:'en',author:{'@type':'Organization',name:'Jamloom',url:origin+'/about'},publisher:{'@type':'Organization','@id':origin+'/#organization',name:'Jamloom',url:origin+'/about'},...(g.updated?{dateModified:g.updated}:{}),image:origin+'/opengraph-image'},
 ]};
 return <article className="product-document">
  <nav aria-label="Breadcrumb"><Link href="/learn">Guides</Link> / {g.title}</nav><h1>{g.title}</h1>
  <p className="muted">By <Link href="/about">Jamloom</Link>{g.updated&&<> · Updated <time dateTime={g.updated}>{new Date(g.updated+'T12:00:00Z').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'})}</time></>}</p>
  {g.paragraphs.map(p=><p key={p}>{p}</p>)}
  {g.sections?.map((section,i)=><section key={section.heading} aria-labelledby={'section-'+i}><h2 id={'section-'+i}>{section.heading}</h2>{section.paragraphs.map(p=><p key={p}>{p}</p>)}</section>)}
  {g.workspace&&<p><Link className="primary" href={g.workspace.href}>{g.workspace.label} →</Link></p>}
  {['how-to-become-a-dj','laptop-dj'].includes(slug)&&<nav className="product-actions" aria-label="Start learning to DJ"><Link className="primary" href="/academy/lessons/first-crossfade">Start the free DJ lesson</Link><Link href="/dj-studio">Practise in the DJ studio →</Link></nav>}
  <aside aria-label="Related guides"><h2>Keep exploring</h2><ul>{related.map(id=><li key={id}><Link href={'/learn/'+id}>{guides[id].title}</Link></li>)}</ul><Link href="/pricing">Current plans and availability</Link> · <Link href="/privacy">Privacy and recording</Link></aside>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replaceAll('<','\\u003c')}}/>
 </article>;
}
