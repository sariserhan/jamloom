import {singingRecordings} from './singing-recordings.js';
const id=new URL(location.href).searchParams.get('lesson')||location.pathname.split('/').filter(Boolean).at(-1);
if(singingRecordings.some(song=>song.id===id))await import('./singing-produced.js');
else await import('./singing.js');
