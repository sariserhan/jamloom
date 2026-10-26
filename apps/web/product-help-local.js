import {mountProductHelp} from './product-help.js';
if(!window.jamloomMobile){
const host=document.createElement('div');host.className='product-help-host';document.querySelector('main')?.prepend(host);
mountProductHelp(host,location.pathname.endsWith('dj.html')?'dj-studio':'remix');

}
