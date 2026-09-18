/* Only this prototype's static files. No economy, personal records, analytics or push. */
'use strict';
const VERSION='__BUILD_HASH__';
const ROOT=new URL('./',self.location.href);
const PREFIX='arucon-mcheck:'+encodeURIComponent(ROOT.pathname)+':';
const CACHE=PREFIX+VERSION;
const FILES=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable.png','./icons/apple-touch-icon.png'].map(p=>new URL(p,ROOT).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
// New releases wait rather than reloading a meal or a touch mid-action.
self.addEventListener('message',event=>{if(event.data?.type==='ARUCON_ACTIVATE')self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil((async()=>{const names=await caches.keys();await Promise.all(names.filter(n=>n.startsWith(PREFIX)&&n!==CACHE).map(n=>caches.delete(n)));await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==ROOT.origin||!url.pathname.startsWith(ROOT.pathname))return;
 const clean=new URL(url.href);clean.search='';clean.hash='';
 if(!FILES.includes(clean.href))return;
 event.respondWith((async()=>{const c=await caches.open(CACHE);const hit=await c.match(clean.href);if(hit)return hit;return fetch(req);})());
});
