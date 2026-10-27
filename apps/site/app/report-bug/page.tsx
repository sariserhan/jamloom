import {ContactForm} from '../contact/form';
export const dynamic='force-dynamic';
export const metadata={title:'Report a bug',description:'Tell Jamloom what went wrong so we can fix it.'};
export default function ReportBug(){return <section className="product-document"><p className="eyebrow">Help us improve</p><h1>Something not working?</h1><p>Tell us which product you were using, what you expected and what happened. Your report goes directly to the Jamloom admin inbox.</p><ContactForm kind="bug"/></section>;}
