export const likedTags={groove:'Groove',vocals:'Singing',lyrics:'Lyrics',energy:'Energy',variety:'Variety',ending:'Ending',language:'Language',style:'Style match'};
export const issueTags={weak_opening:'Weak opening',awkward_transition:'Awkward transition',too_slow:'Too slow',too_fast:'Too fast',too_soft:'Too soft',too_harsh:'Too harsh',robotic_vocals:'Robotic singing',unclear_words:'Unclear words',repetitive:'Too repetitive',abrupt_ending:'Abrupt ending',wrong_language:'Wrong language',wrong_style:'Wrong style'};
export type DnaFeedback={rating:'like'|'dislike';tags:string[];personalize:boolean;trainingConsent:boolean;momentSeconds?:number};
export function validateFeedback(value:unknown):DnaFeedback{
 if(!value||typeof value!=='object')throw Error('Invalid feedback');const f=value as DnaFeedback;
 if(!['like','dislike'].includes(f.rating)||!Array.isArray(f.tags)||f.tags.length>6||new Set(f.tags).size!==f.tags.length||f.tags.some(t=>typeof t!=='string'||!Object.hasOwn(f.rating==='like'?likedTags:issueTags,t))||typeof f.personalize!=='boolean'||typeof f.trainingConsent!=='boolean')throw Error('Invalid feedback');
 if(f.momentSeconds!==undefined&&(!Number.isFinite(f.momentSeconds)||f.momentSeconds<0||f.momentSeconds>36000))throw Error('Invalid feedback time');
 return {...(f.momentSeconds===undefined?{}:{momentSeconds:Math.round(f.momentSeconds)}),rating:f.rating,tags:[...f.tags],personalize:f.personalize,trainingConsent:f.trainingConsent};
}
