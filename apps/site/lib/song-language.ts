import manifest from '../../../assets/manifests/dna-languages.json';

const labels:Record<string,string>={...manifest.languages,und:'Language not specified',zxx:'Instrumental'};
export const languageAliases:Record<string,string>={...Object.fromEntries(Object.entries(labels).map(([code,label])=>[label.toLowerCase(),code])),'':'und',auto:'und',automatic:'und',unknown:'und','no vocals':'zxx'};
export function songLanguage(value:unknown):string {
 if(typeof value!=='string'||!value.trim())return 'und';
 const code=value.trim().toLowerCase();
 if(['auto','automatic','unknown','und'].includes(code))return 'und';
 if(['instrumental','no vocals','zxx'].includes(code))return 'zxx';
 const named=Object.entries(labels).find(([,label])=>label.toLowerCase()===code)?.[0];
 return named??(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(code)?code:'und');
}
export function languageLabel(code:string){return labels[code]??code;}
export function languageOptions(values:unknown[]){return [...new Set(values.map(songLanguage))].sort((a,b)=>languageLabel(a).localeCompare(languageLabel(b)));}
export function languageMatches(value:unknown,selected:string){return !selected||songLanguage(value)===selected;}
