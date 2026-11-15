import {requireAdmin} from '../../../lib/admin-page';import {siteSettings} from '../../../lib/site-settings';import {billingReadiness} from '../../../lib/billing-mode';import {gpuRevenueBalance} from '../../../lib/gpu-revenue';

// Postgres int8 columns arrive as BigInt here; convert before arithmetic.
const usd=(micros:unknown,digits=2)=>'$'+(Number(micros??0)/1e6).toFixed(digits);
const day=(d:Date)=>new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
const SOURCE:Record<string,string>={stripe_live:'Card (Stripe)',apple_live:'App Store',stripe_test:'Card · test',apple_sandbox:'App Store · test',promo_live:'Free / gift',promo_test:'Free / gift · test'};
const KIND:Record<string,string>={subscription:'Creator plan',topup:'Top-up',trial:'Free trial'};

export default async function Billing(){const {pool}=await requireAdmin(),settings=await siteSettings(pool),readiness=billingReadiness(settings.billing_mode);
 const lots=(await pool.query(`SELECT l.provider,l.grant_kind,l.credits,l.net_micros,l.created_at,u.email,l.receipt LIKE 'admin-gift:%' AS gift,
  EXISTS(SELECT 1 FROM purchase_holds h WHERE h.provider=l.provider AND h.receipt=l.receipt) AS held
  FROM credit_lots l JOIN "user" u ON u.id=l.owner_id ORDER BY l.created_at DESC LIMIT 50`)).rows;
 const subs=(await pool.query(`SELECT s.provider,s.status,s.period_end,s.cancel_at_period_end,u.email FROM credit_subscriptions s JOIN "user" u ON u.id=s.owner_id ORDER BY s.period_end DESC LIMIT 20`)).rows;
 const totals=(await pool.query(`SELECT COALESCE(sum(net_micros) FILTER(WHERE provider IN ('stripe_live','apple_live')),0) AS paid,
  count(*) FILTER(WHERE provider IN ('stripe_live','apple_live'))::int AS paid_count,
  COALESCE(sum(credits) FILTER(WHERE receipt LIKE 'admin-gift:%'),0)::int AS gifted FROM credit_lots`)).rows[0];
 const permit=(await pool.query('SELECT cap_micros,reserved_micros,config FROM cloud_capacity_permits ORDER BY created_at DESC LIMIT 1')).rows[0];
 const funding=await gpuRevenueBalance(pool);
 const jobs=(await pool.query('SELECT r.id,u.email,r.status,r.cost_cap_micros,r.actual_cost_micros,r.credit_exempt,r.created_at FROM generation_reservations r JOIN "user" u ON u.id=r.owner_id ORDER BY r.created_at DESC LIMIT 30')).rows;
 const purchases=(await pool.query('SELECT p.receipt,p.product_key,u.email,p.amount_cents,p.sandbox,p.refund_hold,p.dispute_hold FROM academy_purchases p JOIN "user" u ON u.id=p.owner_id ORDER BY p.created_at DESC LIMIT 50')).rows;
 const permitEnds=permit?.config?.expiresAt?new Date(permit.config.expiresAt):null;
 return <><h1>Billing &amp; costs</h1>
 <div className="admin-stats">
  <p><strong>{usd(totals.paid)}</strong>Net paid sales, all time<br/><small>{totals.paid_count} purchases</small></p>
  <p><strong>{permit?`${usd(permit.reserved_micros)} / ${usd(permit.cap_micros)}`:'None'}</strong>GPU permit used<br/><small>{permitEnds?(permitEnds.getTime()>Date.now()?'Ends ':'Ended ')+day(permitEnds):''}</small></p>
  <p><strong>{usd(funding)}</strong>GPU money from sales<br/><small>20% of each paid purchase</small></p>
  <p><strong>{totals.gifted}</strong>Credits gifted<br/><small>Free; never funds GPU</small></p>
 </div>
 <p>Billing mode: <strong>{settings.billing_mode==='live'?'Live — real charges':'Test — no real charges'}</strong> (change it on <a href="/admin">Overview</a>). Stripe keys: {readiness.configured?'set':'incomplete'}. <a href={settings.billing_mode==='test'?'https://dashboard.stripe.com/test/payments':'https://dashboard.stripe.com/payments'} target="_blank" rel="noopener noreferrer">Open Stripe payments and refunds ↗</a></p>

 <h2>Recent credits added</h2><p>Every purchase, free trial and gift. “On hold” means a refund or dispute arrived and those credits can’t be spent.</p>
 {lots.length?<div className="admin-table"><table><thead><tr><th>Date</th><th>Account</th><th>What</th><th>Credits</th><th>Net paid</th></tr></thead><tbody>{lots.map((l,i)=><tr key={i}><td>{day(l.created_at)}</td><td>{l.email}</td><td>{l.gift?'Admin gift':KIND[l.grant_kind]??l.grant_kind} · {SOURCE[l.provider]??l.provider}{l.held?' · On hold':''}</td><td>{l.credits}</td><td>{l.provider.startsWith('promo')?'—':usd(l.net_micros)}</td></tr>)}</tbody></table></div>:<p>No credits added yet.</p>}

 <h2>Creator subscriptions</h2>
 {subs.length?<div className="admin-table"><table><thead><tr><th>Account</th><th>Source</th><th>Status</th><th>Current period ends</th></tr></thead><tbody>{subs.map((s,i)=><tr key={i}><td>{s.email}</td><td>{SOURCE[s.provider]??s.provider}</td><td>{s.status}{s.cancel_at_period_end?' · cancels at period end':''}</td><td>{day(s.period_end)}</td></tr>)}</tbody></table></div>:<p>No subscriptions yet.</p>}

 <h2>Recent song and DJ jobs</h2><p>Cost ceiling is the most a job may spend; actual is what the GPU really cost. Your own jobs never use credits.</p>
 {jobs.length?<div className="admin-table"><table><thead><tr><th>Date</th><th>Account</th><th>State</th><th>Ceiling / actual</th><th>Credits</th></tr></thead><tbody>{jobs.map(j=><tr key={j.id}><td>{day(j.created_at)}</td><td>{j.email}</td><td>{j.status}</td><td>{usd(j.cost_cap_micros,4)} / {j.actual_cost_micros===null?'Pending':usd(j.actual_cost_micros,4)}</td><td>{j.credit_exempt?'Owner (free)':'Charged'}</td></tr>)}</tbody></table></div>:<p>No jobs yet.</p>}

 <h2>Academy purchases</h2>
 {purchases.length?<div className="admin-table"><table><thead><tr><th>Account</th><th>Course</th><th>Amount</th><th>Environment / holds</th></tr></thead><tbody>{purchases.map(p=><tr key={p.receipt}><td>{p.email}</td><td>{p.product_key==='singing-complete'?'Singing Academy':'DJ Academy'}</td><td>${(Number(p.amount_cents)/100).toFixed(2)}</td><td>{p.sandbox?'Test':'Live'}{p.refund_hold?' · Refund':''}{p.dispute_hold?' · Dispute':''}</td></tr>)}</tbody></table></div>:<p>No Academy purchases yet.</p>}
 </>;
}
