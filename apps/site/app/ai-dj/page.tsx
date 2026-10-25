import {djBetaAllowed} from '../../lib/dj-beta-access';
import {headers} from 'next/headers';
import {services,accountsConfigured} from '../../lib/services';
import {notFound} from 'next/navigation';
import {AIDJ} from './studio';
import './studio.css';
export const dynamic='force-dynamic';
export const metadata={title:'AI DJ · Private beta · Jamloom',robots:{index:false,follow:false}};
export default async function AIDJPage(){
 if(process.env.NODE_ENV!=='development'&&process.env.JAMLOOM_AI_DJ_BETA_ENABLED!=='true')notFound();
 let owner:string|null=null,allowed=process.env.NODE_ENV==='development';try{if(accountsConfigured()){const session=await services().auth.api.getSession({headers:await headers()});allowed=djBetaAllowed(session?.user);if(session?.user.emailVerified&&allowed)owner=session.user.id;}}catch{}
 if(!allowed)notFound();
 return <AIDJ owner={owner}/>;
}
