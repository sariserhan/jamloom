// Replay two verified originals before/after the overlap change; no paid generation.
import {readFile,writeFile,unlink} from 'node:fs/promises';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
const root=new URL('../../../',import.meta.url),site=new URL('apps/site/',root),temporary=new URL('tests/.dj-overlap-capture.mjs',site);
let source=await readFile(new URL('tests/dj-mix-comparison.mjs',site),'utf8');
assert.equal(source.split("'renders/dj-representative-mix-20261026'").length,2);
source=source.replace("'renders/dj-representative-mix-20261026'","'renders/dj-overlap-20261026'");
source=source.replace('const flowSource=',`const selection=JSON.parse(await readFile(root+'/docs/evidence/product-release-20261026/overlap-selection.json','utf8'));tracks=await Promise.all(selection.files.map(async(row,index)=>{const bytes=await readFile(root+'/'+row.file);assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256);return{bytes,track:{id:String(index),title:'Overlap original '+(index+1),artist:'Jamloom original',url:'/audio/'+index,sha256:row.sha256,energy:4,style:'house',mood:'deep',vocal:false,credit:''}};}));\nconst flowSource=`);
source=source.replace(/^const revisions=.*bundles=\{\};$/m,"const revisions={before:'short-blend',after:'working-tree'},bundles={};");
source=source.replace("const plugins=ref==='working-tree'?[]:",`const plugins=ref==='working-tree'?[]:ref==='short-blend'?[{name:'short-blend-baseline',setup(b){b.onLoad({filter:/ai-dj-(plan|player)\\.ts$/},async args=>{let contents=await readFile(args.path,'utf8');if(args.path.endsWith('ai-dj-plan.ts')){assert.ok(contents.includes('vocals?[8]:[32,16,4]'));contents=contents.replace('vocals?[8]:[32,16,4]','vocals?[8]:[4]');}else contents=execFileSync('git',['show','f5f251cc:apps/site/lib/ai-dj-player.ts'],{cwd:root,encoding:'utf8'});return{contents,loader:'ts',resolveDir:resolve(args.path,'..')};});}}]:`);
assert.ok(source.includes("const revisions={before:'short-blend'"));await writeFile(temporary,source,{flag:'wx'});
try{execFileSync(process.execPath,[temporary.pathname,'--representative-set'],{cwd:site.pathname,stdio:'inherit',timeout:220000});}finally{await unlink(temporary);}
const report=JSON.parse(await readFile(new URL('renders/dj-overlap-20261026/report.json',root),'utf8')),after=report.results.find(r=>r.name==='after');
const blend=after.blends.filter(b=>b.plan.includes('gradual blend'));assert.ok(blend.length>=10);
assert.ok(blend.some(b=>b.cross>.15&&b.cross<.3&&Math.abs(b.eq[0][0])<.01),'Outgoing bass holds in the early overlap');
assert.ok(blend.some(b=>b.cross>.7&&b.cross<.85&&Math.abs(b.eq[1][0])<.01),'Incoming bass is established before the outgoing track ends');
report.overlap_checks={status:'PASS',samples:blend.length,measured_seconds:blend.at(-1).elapsed-blend[0].elapsed,outgoing_bass_held:true,incoming_bass_established:true};
await writeFile(new URL('overlap-capture.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log('Real overlap and bass handoff PASS');
