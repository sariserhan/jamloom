import {recordingTitle} from '../../web/set-recording-name.js';
import {validDJStyle,type DJStyle} from './dj-styles';
import {AudioError} from './audio-validation';
export type DJSessionInput={id:string;title:string;visibility:'public'|'private';style:DJStyle;energy:number;minutes?:number;mood?:'warm'|'bright'|'deep'};
export function djSessionInput(value:unknown):DJSessionInput{
 const v=value as Record<string,unknown>;
 if(!v||(v.minutes!==undefined&&(!Number.isInteger(v.minutes)||Number(v.minutes)<1||Number(v.minutes)>120))||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!['id','title','visibility','style','energy','mood','minutes'].includes(k))||typeof v.id!=='string'||!/^[a-f0-9]{32}$/.test(v.id)||typeof v.title!=='string'||!recordingTitle(v.title)||v.title!==recordingTitle(v.title)||!['public','private'].includes(v.visibility===undefined?'private':v.visibility as string)||!validDJStyle(v.style)||(v.mood!==undefined&&!['warm','bright','deep'].includes(v.mood as string))||!Number.isInteger(v.energy)||Number(v.energy)<1||Number(v.energy)>5)throw new AudioError('Choose a party name, style, energy and sharing option.');
 return {id:v.id,...(v.minutes===undefined?{}:{minutes:Number(v.minutes)}),title:v.title,visibility:(v.visibility??'private') as DJSessionInput['visibility'],style:v.style as DJSessionInput['style'],energy:Number(v.energy),...(v.mood===undefined?{}:{mood:v.mood as DJSessionInput['mood']})};
}
