import {ImageResponse} from 'next/og';
import {publicListeningTrack} from '../../../../lib/public-listening.server';
import {coverHue} from '../../../../lib/listening';
export const runtime='nodejs';export const dynamic='force-dynamic';export const contentType='image/png';export const size={width:1200,height:630};
export default async function Image({params}:{params:Promise<{kind:string;id:string}>}){const {kind,id}=await params,t=await publicListeningTrack(kind,id);return new ImageResponse(<div style={{display:'flex',flexDirection:'column',justifyContent:'space-between',width:'100%',height:'100%',padding:70,color:'white',background:`linear-gradient(125deg,#10151a,hsl(${coverHue(id)},55%,28%))`}}><div style={{fontSize:36}}>jamloom / community</div><div style={{fontSize:76,lineHeight:1.1}}>{t?.title??'Song unavailable'}</div><div style={{fontSize:28}}>{t?'Made here. Heard here.':'Explore original music on Jamloom.'}</div></div>,{...size,headers:{'Cache-Control':'private, no-store'}});}
