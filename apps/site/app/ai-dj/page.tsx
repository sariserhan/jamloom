import {notFound} from 'next/navigation';
import {AIDJ} from './studio';
import './studio.css';
export const metadata={title:'AI DJ · Local preview · Jamloom',robots:{index:false,follow:false}};
export default function AIDJPage(){
 if(process.env.NODE_ENV!=='development')notFound();
 return <AIDJ/>;
}
