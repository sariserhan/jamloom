import {singingOffer,singingLessons,singingSongs} from '../../web/singing-course.js';
import {adminAccount} from './admin-access';
import {AcademyStore} from './academy-store';

export function singingContent(access:boolean){return {singingLessons,singingSongs:access?singingSongs:singingSongs.filter(l=>l.id==='first-light')};}
export async function singingAccess(headers:Headers){
 if(!singingOffer.salesReleased&&process.env.SINGING_STRIPE_SANDBOX_ENABLED!=='true')return true;
 const {accountsConfigured,services}=await import('./services');
 if(!accountsConfigured())return false;
 const {auth,pool}=services(),session=await auth.api.getSession({headers});
 return !!session?.user.emailVerified&&(await adminAccount(pool,session.user.id)||await new AcademyStore(pool).access(session.user.id,pool,undefined,'singing-complete'));
}
