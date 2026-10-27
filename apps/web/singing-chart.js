// The playhead follows the audio clock; every trace point comes from measured microphone PCM.
export function drawSingingChart(canvas,phrase,time,trace,root){
 const width=Math.max(280,canvas.clientWidth),height=210,dpr=Math.min(2,globalThis.devicePixelRatio||1);if(canvas.width!==Math.round(width*dpr)||canvas.height!==height*dpr){canvas.width=Math.round(width*dpr);canvas.height=height*dpr;}
 const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle='#12101c';c.fillRect(0,0,width,height);
 const span=8,left=Math.max(0,time-2.5),x=t=>(t-left)/span*width,y=n=>height-24-(n-root+2)/16*(height-42);
 c.font='11px ui-monospace,monospace';for(let n=root-2;n<=root+14;n+=2){c.strokeStyle='#352b46';c.beginPath();c.moveTo(0,y(n));c.lineTo(width,y(n));c.stroke();}
 for(const n of phrase){if(n.note===null||n.at+n.duration<left||n.at>left+span)continue;c.fillStyle=n.at<=time&&time<n.at+n.duration?'#c8adff':'#6a567f';c.fillRect(x(n.at),y(n.note)-6,Math.max(3,n.duration/span*width-2),12);}
 let previous=null;for(const point of trace){if(point.at<left||point.at>left+span||point.note===null){previous=null;continue;}c.strokeStyle=point.good?'#a3ebc5':'#ffc47b';c.lineWidth=3;c.beginPath();c.moveTo(previous?x(previous.at):x(point.at),previous?y(previous.note):y(point.note));c.lineTo(x(point.at),y(point.note));c.stroke();previous=point;}
 c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.moveTo(x(Math.max(0,time)),8);c.lineTo(x(Math.max(0,time)),height-12);c.stroke();c.fillStyle='#c7c1d4';if(phrase.length)c.fillText('MELODY',8,15);c.fillStyle='#a3ebc5';c.fillText('YOUR VOICE',width-88,15);
}
