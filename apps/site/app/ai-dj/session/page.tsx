import {notFound} from 'next/navigation';
import {SessionSetup} from './setup';
import '../studio.css';
export const metadata={title:'Plan your AI DJ set · Jamloom',robots:{index:false,follow:false}};
export default function Page(){if(process.env.NODE_ENV!=='development')notFound();return <SessionSetup/>;}
