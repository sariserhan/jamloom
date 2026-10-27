import {djBetaAllowed} from '../../lib/dj-beta-access';
import {headers} from 'next/headers';
import {services,accountsConfigured} from '../../lib/services';
import {AIDJOverview} from './overview';
import {pageMetadata} from '../../lib/product';
import {AIDJ} from './studio';
import './studio.css';
export const dynamic='force-dynamic';
const marketing=pageMetadata('AI DJ — Your party. Its own soundtrack.','Explore original AI DJ sets, a performing deck, mood controls and complete session recordings. Public generation is in development.','/ai-dj');
export const metadata={...marketing,openGraph:{...marketing.openGraph,images:[{url:'/product-previews/ai-dj.png',width:1440,height:764}]},twitter:{...marketing.twitter,images:['/product-previews/ai-dj.png']}};
export default async function AIDJPage(){
 if(process.env.NODE_ENV!=='development'&&process.env.JAMLOOM_AI_DJ_BETA_ENABLED!=='true')return <AIDJOverview/>;
 let owner:string|null=null,allowed=process.env.NODE_ENV==='development';try{if(accountsConfigured()){const session=await services().auth.api.getSession({headers:await headers()});allowed=djBetaAllowed(session?.user);if(session?.user.emailVerified&&allowed)owner=session.user.id;}}catch{}
 if(!allowed)return <AIDJOverview/>;
 return <AIDJ owner={owner}/>;
}
