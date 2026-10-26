import {singingOffer} from '../../../../web/singing-course.js';
import {services,accountsConfigured} from '../../../lib/services';
import {siteSettings} from '../../../lib/site-settings';
import {billingReadiness} from '../../../lib/billing-mode';
import {AcademyBuy} from '../../academy/checkout/buy';
export const dynamic='force-dynamic';
export default async function SingingCheckout(){
 let enabled=false,mode:'test'|'live'='test';if(accountsConfigured())try{mode=(await siteSettings(services().pool)).billing_mode;enabled=billingReadiness(mode,process.env,'singing-complete').academyCheckoutEnabled;}catch{}
 return <section className="product-document"><p className="eyebrow">Singing Academy</p><h1>Your voice. Your own pace.</h1><h2>${singingOffer.priceCents/100} USD <small>one-time · before applicable tax</small></h2><p>Eight original practice songs, full highlighted lyrics, live pitch and timing feedback, section practice and twelve optional warm-ups. Repeat the included lessons as often as you like. No subscription or generation credits.</p><p>Sales are not open yet. You can keep using the free preview. Popular-song lessons are not included: their permissions and assets are still pending.</p><AcademyBuy enabled={enabled} mode={mode} course="singing-complete"/><p>Microphone audio stays on your device. Feedback varies with your voice, room and microphone; it is not professional certification.</p><a href="/singing-academy">Try the free preview →</a></section>;
}
