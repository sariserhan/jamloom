const pending=new Map<string,Promise<Response>>();
// Share concurrent gallery reads only; never retain account data after the request.
export function galleryRead(url:string,fresh=false){
 if(fresh||new URL(url,'http://localhost').searchParams.get('view')==='mine')return fetch(url,{signal:AbortSignal.timeout(10000)});
 let request=pending.get(url);
 if(!request){
  request=fetch(url,{signal:AbortSignal.timeout(10000)});pending.set(url,request);
  void request.finally(()=>pending.delete(url)).catch(()=>{});
 }
 return request.then(response=>response.clone());
}
