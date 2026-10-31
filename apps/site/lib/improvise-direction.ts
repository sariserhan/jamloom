import {randomInt} from 'node:crypto';
import styles from '../../../assets/manifests/improvise-styles.json';
import energies from '../../../assets/manifests/improvise-energy.json';

type RecentDirection={genre?:unknown;energy?:unknown};
const genres=Object.keys(styles),levels=Object.keys(energies);
// Recent choices come from persisted jobs, newest first, under the submit lock.
export function improviseDirection(requested:string,recent:RecentDirection[],pick:(max:number)=>number=randomInt){
 if(requested!=='surprise'&&!genres.includes(requested))throw Error('Unknown Improvise style');
 const used=new Set(recent.slice(0,8).map(row=>row.genre));
 const choices=genres.filter(genre=>!used.has(genre));
 const recentEnergy=new Set(recent.slice(0,2).map(row=>row.energy));
 const energyChoices=levels.filter(energy=>!recentEnergy.has(energy));
 return {genre:requested==='surprise'?choices[pick(choices.length)]:requested,
  energy:energyChoices[pick(energyChoices.length)]};
}
