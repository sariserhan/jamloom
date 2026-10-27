'use client';
import {useState,useEffect} from 'react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import navigation from '../lib/site-navigation.json';
export function SiteNavigation(){const [open,setOpen]=useState(false),path=usePathname();useEffect(()=>setOpen(false),[path]);return <><button className="nav-toggle secondary" aria-controls="main-navigation" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'Close ×':'Menu ☰'}</button><nav id="main-navigation" className={open?'navigation-open':''} aria-label="Main">{navigation.map(n=><Link prefetch={false} href={n.href} key={n.href} aria-current={path===n.href?'page':undefined}>{n.label}</Link>)}</nav></>;}
