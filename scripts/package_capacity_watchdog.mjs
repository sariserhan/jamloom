// Package the headless services (stop-only guardian, operations monitor, Apple finance)
// from one reviewed commit using the site's exact installed dependencies.
import {build} from '../apps/site/node_modules/esbuild/lib/main.js';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url).pathname;
const dirty=execFileSync('git',['status','--porcelain','--','apps/site/lib','apps/site/scripts/capacity-watchdog.ts','apps/site/scripts/operations-monitor.ts','apps/site/scripts/apple-finance.ts'],{cwd:root,encoding:'utf8'}).trim();
if(dirty)throw Error('Commit the reviewed watchdog runtime before packaging');
const output=resolve(process.argv[2]??resolve(root,'build-capacity-watchdog'));
if(!relative(root,output).startsWith('build-'))throw Error('Use an ignored build-* output directory inside the checkout');
await mkdir(output,{recursive:true});
const bundles={'watchdog.mjs':'capacity-watchdog.ts','operations.mjs':'operations-monitor.ts','finance.mjs':'apple-finance.ts'};
for(const [out,entry] of Object.entries(bundles))await build({entryPoints:[resolve(root,'apps/site/scripts/'+entry)],outfile:resolve(output,out),bundle:true,platform:'node',format:'esm',target:'node22',external:['pg-native'],
 banner:{js:"import { createRequire as nodeCreateRequire } from 'node:module'; const require = nodeCreateRequire(import.meta.url);"}});
const files={};for(const out of Object.keys(bundles)){const bytes=await readFile(resolve(output,out));files[out]={sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};}
await writeFile(resolve(output,'manifest.json'),JSON.stringify({sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),files,node:'22 or 24',guardianCanActivate:false},null,2)+'\n');
console.log(JSON.stringify({output,files,status:'PACKAGED'}));
