import {headers} from 'next/headers';
import {services,accountsConfigured} from '../../lib/services';
import {notFound} from 'next/navigation';
import {AIDJ} from './studio';
import './studio.css';
export const metadata={title:'AI DJ · Local preview · Jamloom',robots:{index:false,follow:false}};
export default async function AIDJPage(){
 if(process.env.NODE_ENV!=='development')notFound();
 let owner:string|null=null;try{if(accountsConfigured()){const session=await services().auth.api.getSession({headers:await headers()});if(session?.user.emailVerified)owner=session.user.id;}}catch{}
 return <AIDJ owner={owner}/>;
}
