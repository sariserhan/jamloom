import {AudioError} from './audio-validation';

export type StyleMatch='matched'|'uncertain';
export function checkedDnaStyle(fit:any,audioHash:string,target:string):StyleMatch {
 if(!fit||typeof fit.accepted!=='boolean'||fit.audio_sha256!==audioHash||fit.target!==target)
  throw new AudioError('The finished song could not be verified.',422);
 // Preserve receipts from the previously qualified worker. New advisory results
 // must explicitly attest to the unchanged technical checks and screen version.
 if(fit.delivery_policy===undefined&&fit.technical===undefined&&fit.accepted===true)return 'matched';
 if(fit.delivery_policy!=='style-guidance-v1'||fit.technical!=='PASS'||fit.screen_version!==1||
  !Number.isSafeInteger(fit.matching_windows)||fit.matching_windows<0||fit.matching_windows>4)
  throw new AudioError('The finished song could not be verified.',422);
 return fit.accepted?'matched':'uncertain';
}
