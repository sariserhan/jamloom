import { notFound } from 'next/navigation';
import { information } from '../../lib/editorial';
import { pageMetadata } from '../../lib/product';
import { CREATOR_PLAN,TOP_UP,TRIAL_CREDITS,songCreditPrice } from '../../lib/credit-catalog';

function PricingSummary(){
 const plans=[
  {name:'Free trial',price:'Free',per:'once',credits:TRIAL_CREDITS,points:['For verified accounts','Enough for one Music DNA song','While trial places last']},
  {name:'Top-up',price:`$${TOP_UP.cents/100}`,per:'one time',credits:TOP_UP.credits,points:['No subscription','Credits never expire','Buy again whenever you like']},
  {name:'Creator',price:`$${CREATOR_PLAN.cents/100}`,per:'per month',credits:CREATOR_PLAN.credits,points:['Best value per credit','Credits never expire','Cancel any time'],best:true},
 ];
 const dna=songCreditPrice('music-dna').credits,imp=songCreditPrice('improvise').credits,dnaPrivate=songCreditPrice('music-dna','private').credits,impPrivate=songCreditPrice('improvise','private').credits;
 return <><div className="pricing-cards">{plans.map(p=><section key={p.name} className={p.best?'pricing-card best':'pricing-card'}><h2>{p.name}</h2><p className="pricing-price"><strong>{p.price}</strong> {p.per}</p><p className="pricing-credits">{p.credits} credits</p><ul>{p.points.map(x=><li key={x}>{x}</li>)}</ul></section>)}</div>
  <h2>What things cost</h2><div className="admin-table"><table><thead><tr><th>You make</th><th>Public</th><th>Private</th><th>Creator plan covers (public)</th></tr></thead><tbody>
   <tr><td>Music DNA song (about 2 minutes, with vocals)</td><td>{dna}</td><td>{dnaPrivate}</td><td>{Math.floor(CREATOR_PLAN.credits/dna)} songs a month</td></tr>
   <tr><td>Improvise arrangement (30–45 seconds)</td><td>{imp}</td><td>{impPrivate}</td><td>{Math.floor(CREATOR_PLAN.credits/imp)} a month</td></tr>
   <tr><td>Replaying or downloading something you made</td><td>Free</td><td>Free</td><td>—</td></tr>
  </tbody></table></div>
  <p>Public songs appear in Community; private songs are only for you and cost 25% more. If a song fails, its credits come back automatically.</p>
  <p className="product-actions"><a className="primary" href="/account/credits">Get credits →</a></p></>;
}
export function generateStaticParams(){return Object.keys(information).map(info=>({info}));}
export const dynamicParams=false;
export async function generateMetadata({params}:{params:Promise<{info:string}>}){const {info}=await params;const p=information[info as keyof typeof information];if(!p)return {};return pageMetadata(p.title,p.description,'/'+info);}
export default async function Information({params}:{params:Promise<{info:string}>}){const {info}=await params;const p=information[info as keyof typeof information];if(!p)notFound();return <article className="product-document"><p className="eyebrow">Jamloom / {info}</p><h1>{p.title}</h1>{info==='pricing'?<><PricingSummary/><details><summary>Full pricing details</summary>{p.paragraphs.map(text=><p key={text}>{text}</p>)}</details></>:p.paragraphs.map(text=><p key={text}>{text}</p>)}
 {info==='examples'&&<section className="product-panel"><h2>Original instrument study</h2><p>11.6 seconds · drums, bass and piano · engine demonstration</p><audio controls preload="none" aria-label="Original instrument study" src="/audio/instrument-study.mp3"/><a href="/audio/instrument-study.json">Source and rendering record</a></section>}
 {info==='licenses'&&<ul>{['VCSL-LICENSE.txt','VSCO-2-CE-LICENSE.txt','BLACK-AND-GREEN-GUITARS-CC0.txt','PREDICT-VOICE-QUALITY-MIT.txt','EMSCRIPTEN-LICENSE.txt'].map(name=><li key={name}><a href={'/studio/licenses/'+name}>{name}</a></li>)}</ul>}
 <div className="product-actions">{info==='pricing'&&<><a href="/account/credits">View your credits and plans →</a><a href="/singing-academy/checkout">Singing Academy course &amp; pricing →</a></>}{['pricing','download','status'].includes(info)&&<><a href="/pro">Get Pro — $49 once →</a><a href="/live-dj">Download free Basic →</a></>}<a href="/improvise">Try local remix →</a><a href="/dj-studio">Open the DJ guide →</a><a href="/learn">Read the guides →</a></div></article>}
