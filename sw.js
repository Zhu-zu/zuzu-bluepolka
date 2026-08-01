// PWA Service Worker — 不做任何缓存，只支持 PWA 安装
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  // 清除所有旧缓存
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
// 不拦截任何请求 — 全部直通网络
self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request));
});
