import examples from '../../../assets/manifests/dna-examples.json';
// Public song pages for the sitemap: curated examples plus songs their creators made public (not withdrawn).
// Internal validation takes are left out on purpose.
export async function publicSongPaths(limit=2000):Promise<{path:string;modified?:Date}[]>{
 const paths:{path:string;modified?:Date}[]=examples.examples.map(s=>({path:`/listen/music-dna/${s.id}`}));
 try{
  // Loaded lazily: services is server-only, and the sitemap must still list static pages without it.
  const {services,accountsConfigured}=await import('./services');if(!accountsConfigured())return paths;
  const rows=(await services().pool.query(`SELECT d.id,d.product,d.completed_at FROM dna_song_jobs d
   WHERE d.billing_live=$1 AND d.state='completed' AND d.visibility='public' AND d.public_consent_at IS NOT NULL
    AND d.withdrawn_at IS NULL AND d.audio_key IS NOT NULL ORDER BY d.completed_at DESC LIMIT $2`,[process.env.CREDIT_BILLING_MODE==='live',limit])).rows;
  for(const r of rows)paths.push({path:`/listen/${r.product}/${r.id}`,modified:r.completed_at??undefined});
 }catch{/* The sitemap still lists every static page if the database is unavailable. */}
 return paths;
}
