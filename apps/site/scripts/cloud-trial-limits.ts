// A longer window is only for the explicitly bounded completion, source-quality and single German Jazz repair profiles.
export function completionWindowSeconds(requested:boolean,mode:string,normal:number):number{
 if(!requested)return normal;
 if(!['improvise-completion','dna-completion','dna-diagnostic','maximum-dna','improvise-quality','improvise-variety','improvise-study'].includes(mode))throw Error('The qualification window requires an explicit completion profile');
 return 2400;
}
