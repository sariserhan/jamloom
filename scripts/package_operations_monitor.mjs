// Independent, non-GPU-starting monitor; package only reviewed committed source.
import {build} from '../apps/site/node_modules/esbuild/lib/main.js';
import {readFile,writeFile,mkdir} from 'node:fs/promises';import {resolve,relative} from 'node:path';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url).pathname;
if(execFileSync('git',['status','--porcelain','--','apps/site/lib','apps/site/scripts/operations-monitor.ts'],{cwd:root,encoding:'utf8'}).trim())throw Error('Commit reviewed monitor source before packaging');
const output=resolve(process.argv[2]??resolve(root,'build-operations-monitor'));
if(!relative(root,output).startsWith('build-'))throw Error('Use an ignored build-* output directory');
await mkdir(output,{recursive:true});
await build({entryPoints:[resolve(root,'apps/site/scripts/operations-monitor.ts')],outfile:resolve(output,'operations.mjs'),bundle:true,platform:'node',format:'esm',target:'node22',external:['pg-native'],banner:{js:"import { createRequire as nodeCreateRequire } from 'node:module'; const require = nodeCreateRequire(import.meta.url);"}});
const bytes=await readFile(resolve(output,'operations.mjs'));await writeFile(resolve(output,'manifest.json'),JSON.stringify({sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,node:'22 or 24',canActivateGPU:false,canPauseCreatorRenewals:true},null,2)+'\n');console.log('Packaged reviewed operations monitor');
