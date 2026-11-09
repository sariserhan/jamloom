import {readFile} from 'node:fs/promises';
import {operatingCostReport} from '../lib/operating-cost-report';
// Offline, read-only: consumes reviewed receipts, never fetches credentials,
// rents hardware, changes a ledger or enables a qualification flag.
const [path,...rest]=process.argv.slice(2);if(!path||rest.length)throw Error('Use operating-cost-report.ts COHORT.json');
const file=await readFile(path);if(file.length>5*1024*1024)throw Error('Cost evidence too large');
console.log(JSON.stringify(operatingCostReport(JSON.parse(file.toString())),null,2));
