const CACHE = 'zuzu-shinchan-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ─── 安装：预缓存所有核心资源 ───
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

// ─── 激活：清理旧缓存，立即接管 ───
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(n => n !== CACHE).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// ─── 请求拦截：cache-first，离线降级 ───
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // 同源请求：cache-first
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) {
          // 后台静默更新缓存
          fetch(e.request).then(r => {
            if (r.ok) {
              const clone = r.clone();
              caches.open(CACHE).then(c => c.put(e.request, clone));
            }
          }).catch(() => {});
          return cached;
        }
        // 没缓存就去网络取
        return fetch(e.request).then(r => {
          if (r.ok) {
            const clone = r.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return r;
        }).catch(() => {
          // 离线且没缓存：返回 index.html 作为 fallback
          return caches.match('./index.html');
        });
      })
    );
    return;
  }

  // 跨域请求（如 Google Fonts）：stale-while-revalidate
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

// ─── 消息通信：支持手动清除缓存 ───
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
  if (e.data === 'clearCache') {
    caches.keys().then(keys => Promise.all(keys.map(n => caches.delete(n))))
      .then(() => { self.clients.claim(); });
  }
});
