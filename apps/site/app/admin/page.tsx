import Link from 'next/link';
import {comingSoonEnabled} from '../../lib/coming-soon';
import {requireAdmin} from '../../lib/admin-page';import {siteSettings} from '../../lib/site-settings';import {billingReadiness} from '../../lib/billing-mode';import {SettingsForm,RetryNotifications} from './forms';

const usd=(micros:unknown)=>'$'+(Number(micros??0)/1e6).toFixed(2);
const since=(ms:number)=>{const m=Math.max(0,Math.round((Date.now()-ms)/60000));return m<60?`${m} min`:`${Math.floor(m/60)} h ${m%60} min`;};
const ACTIONS:Record<string,string>={'user.credits':'Gave credits','user.suspend':'Suspended account','user.restore':'Restored account','site.settings':'Changed site settings','ticket.reply':'Replied to a message','ticket.status':'Changed message status','notifications.retry':'Retried email delivery','training.review':'Reviewed training permission','account.deleted':'Deleted an account','credits.exempt-reservation':'Owner song (no credits used)'};

function studio(cycle:{state:string;starts_at:unknown;ready_at:unknown;expires_at:unknown;reason:string|null}|undefined){
 if(!cycle||cycle.state==='stopped')return {tone:'ok',title:'Off',detail:'No GPU is running, so nothing is being spent. A customer pressing Generate starts it.'};
 if(cycle.state==='starting')return {tone:'busy',title:`Starting · ${since(Number(cycle.starts_at))}`,detail:'A GPU is warming up. A cold start usually takes 10–15 minutes while the music model loads.'};
 if(cycle.state==='ready')return {tone:'busy',title:'On · ready for songs',detail:`Ready for ${since(Number(cycle.ready_at??cycle.starts_at))}. It switches off by itself when idle.`};
 return {tone:'busy',title:'Switching off',detail:'The GPU is being stopped.'};
}

export default async function Admin(){
 const {pool}=await requireAdmin();const settings=await siteSettings(pool);
 const s=(await pool.query(`SELECT
  (SELECT count(*)::int FROM "user") AS users,
  (SELECT count(*)::int FROM "user" WHERE "createdAt">now()-interval '7 days') AS new_users,
  (SELECT count(*)::int FROM support_tickets WHERE status='open') AS tickets,
  (SELECT count(*)::int FROM notification_outbox WHERE sent_at IS NULL AND last_error IS NOT NULL) AS failed_emails,
  (SELECT count(*)::int FROM purchase_holds) AS holds,
  (SELECT count(*)::int FROM credit_wallets WHERE frozen) AS frozen,
  (SELECT count(*)::int FROM dna_song_jobs WHERE state='failed' AND created_at>now()-interval '1 day') AS failed_day,
  (SELECT count(*)::int FROM dna_song_jobs WHERE state IN ('queued','running')) AS in_progress,
  (SELECT count(*)::int FROM dna_song_jobs WHERE state='completed' AND created_at>now()-interval '7 days') AS songs_week,
  (SELECT count(*)::int FROM dna_song_jobs WHERE state='failed' AND created_at>now()-interval '7 days') AS failed_week,
  (SELECT count(*)::int FROM dna_song_jobs WHERE state='completed' AND visibility='public' AND withdrawn_at IS NULL AND created_at>now()-interval '7 days') AS public_week,
  (SELECT count(*)::int FROM credit_lots WHERE provider IN ('stripe_live','apple_live') AND created_at>now()-interval '7 days') AS sales_week,
  (SELECT COALESCE(sum(net_micros),0) FROM credit_lots WHERE provider IN ('stripe_live','apple_live') AND created_at>now()-interval '7 days') AS sales_micros`)).rows[0];
 const cycle=(await pool.query('SELECT state,starts_at,ready_at,expires_at,reason FROM cloud_capacity_cycles ORDER BY starts_at DESC LIMIT 1')).rows[0];
 const permit=(await pool.query('SELECT cap_micros,reserved_micros,config FROM cloud_capacity_permits ORDER BY created_at DESC LIMIT 1')).rows[0];
 const audit=(await pool.query(`SELECT a.action,a.target,a.details,a.created_at,u.email FROM admin_audit a LEFT JOIN "user" u ON u.id=a.target
  WHERE a.action<>'credits.exempt-reservation' ORDER BY a.id DESC LIMIT 15`)).rows;
 const emails=(await pool.query('SELECT message->>\'subject\' AS subject,attempts,last_error FROM notification_outbox WHERE sent_at IS NULL ORDER BY created_at LIMIT 20')).rows;
 const gpu=studio(cycle),permitEnds=permit?.config?.expiresAt?new Date(permit.config.expiresAt):null;
 const attention=[
  s.tickets&&{text:`${s.tickets} open ${s.tickets===1?'message':'messages'} waiting for a reply`,href:'/admin/inbox'},
  s.failed_day&&{text:`${s.failed_day} ${s.failed_day===1?'song':'songs'} failed in the last 24 hours (credits are returned automatically)`,href:'/admin/operations'},
  s.failed_emails&&{text:`${s.failed_emails} ${s.failed_emails===1?'email':'emails'} could not be delivered`,href:'#email'},
  s.holds&&{text:`${s.holds} ${s.holds===1?'purchase is':'purchases are'} on hold after a refund or dispute`,href:'/admin/billing'},
  s.frozen&&{text:`${s.frozen} ${s.frozen===1?'wallet is':'wallets are'} frozen for reconciliation`,href:'/admin/billing'},
  permitEnds&&permitEnds.getTime()-Date.now()<3*864e5&&{text:`GPU spending permit ends ${permitEnds.toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'})}. Songs stop after that unless renewed.`,href:'/admin/billing'},
 ].filter(Boolean) as {text:string;href:string}[];

 return <><h1>Overview</h1>
 <p>Public access: {comingSoonEnabled()?'Coming soon — only verified admins can preview.':settings.maintenance?'Maintenance mode is ON — visitors see the maintenance page.':'Open to everyone.'}</p>

 <h2>Needs your attention</h2>
 {attention.length?<ul className="admin-attention">{attention.map(a=><li key={a.text}><Link prefetch={false} href={a.href}>{a.text} →</Link></li>)}</ul>:<p className="admin-ok">Nothing needs attention.</p>}

 <h2>Right now</h2>
 <div className="admin-stats">
  <p data-tone={gpu.tone}><strong>{gpu.title}</strong>Music studio GPU<br/><small>{gpu.detail}</small></p>
  <p><strong>{s.in_progress}</strong>Songs being made</p>
  {permit&&<p><strong>{usd(permit.reserved_micros)} / {usd(permit.cap_micros)}</strong>GPU permit used<br/><small>{permitEnds?`Ends ${permitEnds.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`:''}</small></p>}
 </div>

 <h2>Last 7 days</h2>
 <div className="admin-stats">
  <p><strong>{s.new_users}</strong>New accounts<br/><small>{s.users} in total</small></p>
  <p><strong>{s.songs_week}</strong>Songs made<br/><small>{s.failed_week} failed</small></p>
  <p><strong>{s.sales_week}</strong>Credit purchases<br/><small>{usd(s.sales_micros)} net</small></p>
 </div>

 <h2>Recent admin actions</h2>
 {audit.length?<ul className="admin-list">{audit.map((r,i)=><li key={i}><strong>{ACTIONS[r.action]??r.action}</strong>{r.action==='user.credits'?` · ${r.details?.credits} credits`:''}{r.email?` · ${r.email}`:''}<br/><time>{new Date(r.created_at).toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'})}</time></li>)}</ul>:<p>No admin actions yet.</p>}

 <h2>Site settings</h2>
 <SettingsForm settings={settings} liveConfigured={billingReadiness('live').configured}/>

 <h2 id="email">Email delivery</h2><p>Signup, contact and support notifications go to serhan.sari@yahoo.com. An accepted email is not proof that it reached the inbox.</p>
 {emails.length?<>{emails.map((m,i)=><p key={i}>{m.subject} · {m.attempts} attempts · {m.last_error??'Queued'}</p>)}<RetryNotifications/></>:<p>All emails sent.</p>}

 <h2>Community music</h2><p>{s.public_week} public {s.public_week===1?'song':'songs'} published in the last 7 days. A song appears in Community as soon as it finishes if its creator chose “Public”; creators can remove their own songs at any time.</p><Link prefetch={false} href="/community">Open Community →</Link>{process.env.JAMLOOM_CATALOGUE_ENABLED==='true'&&<> · <Link prefetch={false} href="/review">Review uploaded tracks →</Link></>}</>;
}
