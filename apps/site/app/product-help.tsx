'use client';
import {useEffect,useRef} from 'react';
import {usePathname} from 'next/navigation';
import {mountProductHelp,productHelp} from '../../web/product-help';
export function ProductHelp(){const path=usePathname(),host=useRef<HTMLDivElement>(null),key=path.split('/')[1];useEffect(()=>{if(host.current&&Object.hasOwn(productHelp,key))return mountProductHelp(host.current,key);},[key]);return <div className="product-help-host" ref={host}/>;}
