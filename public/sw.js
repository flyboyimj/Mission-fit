// Mission Fit service worker: offline use at the gym, without blocking updates.
// No health data passes through here — it lives in localStorage only.
//
// Pages (index.html) are network-first: when online you always get the newest
// deploy; offline you get the last cached copy. Built assets have hashed names,
// so they are safe to serve cache-first.
const CACHE = 'missionfit-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

function put(req, res) {
  const copy = res.clone();
  caches.open(CACHE).then((c) => c.put(req, copy));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  const isPage = req.mode === 'navigate' || (sameOrigin && (url.pathname.endsWith('/') || url.pathname.endsWith('.html')));

  if (isPage) {
    e.respondWith(
      fetch(req)
        .then((res) => { if (res.ok) put(req, res); return res; })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html'))),
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && (sameOrigin || url.hostname.startsWith('fonts.'))) put(req, res);
      return res;
    })),
  );
});
