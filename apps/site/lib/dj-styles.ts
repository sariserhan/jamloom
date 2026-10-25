import manifest from '../../../assets/manifests/dj-styles.json';
import type {BeatDirection} from './dj-beat';
export const djStyles=manifest.styles;
export type DJStyle=keyof typeof djStyles;
export function validDJStyle(value:unknown):value is DJStyle{return typeof value==='string'&&Object.hasOwn(djStyles,value);}
export function defaultBeat(style:DJStyle):BeatDirection{return {bpm:djStyles[style].bpm,groove:djStyles[style].groove as BeatDirection['groove']};}
