import test from 'node:test';
import assert from 'node:assert/strict';
import {improviseDirection} from '../lib/improvise-direction';
import styles from '../../../assets/manifests/improvise-styles.json';

test('automatic Improvise changes style and energy across persisted recent choices',()=>{
 const history:ReturnType<typeof improviseDirection>[]=[];
 for(let i=0;i<100;i++){
  const next=improviseDirection('surprise',history,n=>(i*7)%n);
  assert(!history.slice(0,8).some(row=>row.genre===next.genre));
  assert.notEqual(next.energy,history[0]?.energy);
  assert(Object.hasOwn(styles,next.genre));
  history.unshift(next);
 }
 assert(new Set(history.map(x=>x.genre)).size>15);
 assert.deepEqual(new Set(history.map(x=>x.energy)),new Set(['low','medium','high']));
});
test('explicit style remains selected while energy varies; legacy jobs are safe',()=>{
 const history=[{genre:'jazz',energy:'high'},{genre:'surprise'}];
 assert.deepEqual(improviseDirection('jazz',history,()=>0),{genre:'jazz',energy:'low'});
 assert.throws(()=>improviseDirection('invented',[]),/Unknown/);
 assert(Object.hasOwn(styles,improviseDirection('surprise',[{}],()=>0).genre));
});
