const CACHE = 'zuzu-shinchan-v8';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './sw7.js',
  './icon-192.png',
  './icon-512.png'
];

// ─── 安装：预缓存核心资源 ───
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

// ─── 激活：删除所有旧缓存（包括 v1-v6），立即接管 ───
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(n => n !== CACHE).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// ─── 请求拦截：network-first（在线拿最新，离线用缓存） ───
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // 同源请求：network-first
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(e.request).then(r => {
        if (r.ok) {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return r;
      }).catch(() => {
        // 离线时回退到缓存
        return caches.match(e.request).then(cached =>
          cached || caches.match('./index.html')
        );
      })
    );
    return;
  }

  // 跨域请求：stale-while-revalidate
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(r => {
        if (r.ok) {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return r;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// ─── 消息通信 ───
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
  if (e.data === 'clearCache') {
    caches.keys().then(keys => Promise.all(keys.map(n => caches.delete(n))))
      .then(() => { self.clients.claim(); });
  }
});
