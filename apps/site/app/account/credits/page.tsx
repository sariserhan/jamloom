import {isAdmin} from '../../../lib/admin-access';
import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {accountsConfigured,services} from '../../../lib/services';
import {Wallet} from '../../../lib/wallet';
import {creditBilling} from '../../../lib/stripe-payments';
import {CreditBuy} from './buy';
export const dynamic='force-dynamic';
export default async function Credits(){
 if(!accountsConfigured())redirect('/account/sign-in');const {auth,pool}=services();const session=await auth.api.getSession({headers:await headers()});if(!session?.user.emailVerified)redirect('/account/sign-in');
 let subscriptions:{provider:string;status:string;period_end:Date;cancel_at_period_end:boolean}[]=[];
 let balance:{available:number;reserved:number}|null=null;
 let enabled=false,live=process.env.CREDIT_BILLING_MODE==='live';try{const billing=creditBilling();enabled=billing.enabled;live=billing.live;}catch{}
 try{const wallet=new Wallet(pool,live);balance=await wallet.balance(session.user.id);subscriptions=await wallet.subscriptions(session.user.id);}catch{/* Keep account recovery available when the database is temporarily unavailable. */}
 return <section className="product-document"><h1>Your credits</h1>{isAdmin(session.user)&&<p>Your owner account can make songs without spending credits.</p>}{balance?<p>Available: {balance.available} · Reserved: {balance.reserved}</p>:<p>Credit accounting is not configured on this environment yet.</p>}{subscriptions.map((s,i)=><p key={i}>Creator · {s.provider.startsWith('apple')?'Apple':'Stripe'} · {s.status}{s.cancel_at_period_end?' · Renewal cancelled':''} · Current period ends {new Date(s.period_end).toLocaleDateString('en-US',{timeZone:'UTC'})}. Your remaining paid credits do not expire.</p>)}<CreditBuy enabled={enabled} live={live} subscribed={subscriptions.some(s=>!['canceled','expired','revoked','incomplete_expired'].includes(s.status))}/><a href="/account/purchases">Purchase history →</a></section>;
}
