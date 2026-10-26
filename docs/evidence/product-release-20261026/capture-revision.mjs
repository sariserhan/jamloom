// Same retained inputs and capture checks; use a fresh destination to preserve the rejected recording.
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=new URL('../../../',import.meta.url),site=new URL('apps/site/',root),temporary=new URL('tests/.dj-handoff-capture.mjs',site);
const late=process.argv.includes('--late-entry');
let source=await readFile(new URL('tests/dj-mix-comparison.mjs',site),'utf8');
assert.equal(source.split("'renders/dj-representative-mix-20261026'").length,2);
if(late){assert.equal(source.split('result.seconds>tracks.length*30').length,2);source=source.replace('result.seconds>tracks.length*30','result.seconds>tracks.length*16');}
await writeFile(temporary,source.replace("'renders/dj-representative-mix-20261026'",late?"'renders/dj-representative-energy-20261026'":"'renders/dj-representative-revision-20261026'"),{flag:'wx'});
try{execFileSync(process.execPath,[temporary.pathname,'--representative-set'],{cwd:site.pathname,stdio:'inherit',timeout:340000});}finally{await unlink(temporary);}
