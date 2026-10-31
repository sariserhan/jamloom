import {creditBilling} from '../../../lib/stripe-payments';
import {CREATOR_PLAN,TOP_UP,TRIAL_CREDITS,CREDIT_CATALOG_VERSION} from '../../../lib/credit-catalog';
import {accountsConfigured,services} from '../../../lib/services';
import {Wallet} from '../../../lib/wallet';
import {deletionRequest} from '../../../lib/account-deletion';
import {AcademyStore} from '../../../lib/academy-store';
import {singingOffer} from '../../../../web/singing-offer.js';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
export async function GET(request:Request){
 if(!accountsConfigured())return Response.json({error:'Accounts unavailable.'},{status:503,headers});
 try{
  const {auth,pool}=services();
  const session=await auth.api.getSession({headers:request.headers});
  if(!session?.user.emailVerified)return Response.json({error:'Verified sign-in required.'},{status:401,headers});
  let purchasesReleased=false;try{purchasesReleased=creditBilling().enabled;}catch{}
  const wallet=new Wallet(pool,process.env.CREDIT_BILLING_MODE==='live'),balance=await wallet.balance(session.user.id),subscriptions=await wallet.subscriptions(session.user.id);
  return Response.json({user:{id:session.user.id,email:session.user.email},balance,purchasesReleased,subscriptions,creditCatalog:{version:CREDIT_CATALOG_VERSION,creator:CREATOR_PLAN,topup:TOP_UP,trialCredits:TRIAL_CREDITS,paidCreditsExpire:false},singing:{released:singingOffer.salesReleased,access:await new AcademyStore(pool).access(session.user.id,pool,undefined,'singing-complete')},deletionRequest:await deletionRequest(pool,session.user.id)},{headers});
 }catch{return Response.json({error:'Account balance unavailable.'},{status:503,headers});}
}
