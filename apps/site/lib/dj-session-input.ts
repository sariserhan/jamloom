import {recordingTitle} from '../../web/set-recording-name.js';
import {AudioError} from './audio-validation';
export type DJSessionInput={id:string;title:string;visibility:'public'|'private';style:'house'|'tech-house'|'techno';energy:number};
export function djSessionInput(value:unknown):DJSessionInput{
 const v=value as Record<string,unknown>;
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!['id','title','visibility','style','energy'].includes(k))||typeof v.id!=='string'||!/^[a-f0-9]{32}$/.test(v.id)||typeof v.title!=='string'||!recordingTitle(v.title)||v.title!==recordingTitle(v.title)||!['public','private'].includes(v.visibility===undefined?'public':v.visibility as string)||typeof v.style!=='string'||!['house','tech-house','techno'].includes(v.style)||!Number.isInteger(v.energy)||Number(v.energy)<1||Number(v.energy)>5)throw new AudioError('Choose a party name, style, energy and sharing option.');
 return {id:v.id,title:v.title,visibility:(v.visibility??'public') as DJSessionInput['visibility'],style:v.style as DJSessionInput['style'],energy:Number(v.energy)};
}
