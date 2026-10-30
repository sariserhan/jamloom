// A longer window is only for the three bounded completion profiles, never a diagnostic.
export function completionWindowSeconds(requested:boolean,mode:string,normal:number):number{
 if(!requested)return normal;
 if(!['improvise-completion','dna-completion','maximum-dna'].includes(mode))throw Error('The qualification window requires an explicit completion profile');
 return 2400;
}
