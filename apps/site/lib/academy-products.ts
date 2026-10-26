import {ACADEMY_PRICE_CENTS} from './academy-content';
import {singingOffer} from '../../web/singing-course.js';
export type AcademyProduct='academy-complete'|'singing-complete';
export function academyProductKey(value:unknown):AcademyProduct {
 if(value===undefined||value===null||value==='academy-complete')return 'academy-complete';
 if(value==='singing-complete')return value;
 throw Error('Unknown Academy product');
}
export const academyPrice=(product:AcademyProduct)=>product==='singing-complete'?singingOffer.priceCents:ACADEMY_PRICE_CENTS;
