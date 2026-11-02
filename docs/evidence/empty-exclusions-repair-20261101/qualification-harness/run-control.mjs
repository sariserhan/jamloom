import {parseEnv} from 'node:util';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../build-academy-release/notification-cron.env',import.meta.url),'utf8');
process.env.CRON_SECRET=parseEnv(source).CRON_SECRET;
await import('./control.mts');
