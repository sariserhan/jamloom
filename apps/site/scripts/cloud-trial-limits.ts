// A longer window is only for the explicitly bounded completion and source-quality profiles, never a diagnostic.
export function completionWindowSeconds(requested:boolean,mode:string,normal:number):number{
 if(!requested)return normal;
 if(!['improvise-completion','dna-completion','maximum-dna','improvise-quality'].includes(mode))throw Error('The qualification window requires an explicit completion profile');
 return 2400;
}
