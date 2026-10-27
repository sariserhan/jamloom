import {readFile,mkdir,copyFile,readdir,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {singingRecordings} from '../../web/singing-recordings.js';
export async function prepareSingingRecordings(){
 const source=new URL('../../../assets/singing-recordings/',import.meta.url),target=new URL('../private/singing-recordings/',import.meta.url);
 const manifest=JSON.parse(await readFile(new URL('manifest.json',source),'utf8')),files=[];
 if(JSON.stringify(manifest.songs.map(s=>s.id))!==JSON.stringify(singingRecordings.map(s=>s.id)))throw Error('Singing catalogue does not match audio manifest');
 for(const song of manifest.songs)for(const kind of ['song','karaoke','lyrics']){
  const item=song.files[kind],name=`${song.id}-${kind}.${kind==='lyrics'?'json':'mp3'}`;
  if(item.file!==name)throw Error('Invalid singing asset');
  const data=await readFile(new URL(name,source));if(data.length!==item.bytes||createHash('sha256').update(data).digest('hex')!==item.sha256)throw Error('Singing asset hash mismatch');files.push(name);
 }
 await mkdir(target,{recursive:true});for(const name of files)await copyFile(new URL(name,source),new URL(name,target));
 for(const name of await readdir(target))if(!files.includes(name))await rm(new URL(name,target),{recursive:true});
}
