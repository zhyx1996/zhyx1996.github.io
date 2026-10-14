/**
 * 五子棋引擎资源缓存 Service Worker
 * 缓存 WASM/JS/DATA 文件到 Cache Storage，二次访问秒开。
 * 与 coi-serviceworker 共存（coi 处理跨域头，本 SW 处理缓存）。
 */
const CACHE_NAME = 'gomoku-engine-v1';
const CACHE_PATTERNS = [
  /\/gomoku\/build\/rapfi.*\.(js|wasm|data)$/,
  /\/gomoku\/(board|game|app|ui|rapfi_bridge)\.js$/,
  /\/gomoku\/style\.css$/,
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n.startsWith('gomoku-engine-') && n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  const shouldCache = CACHE_PATTERNS.some((p) => p.test(url.pathname));
  if (!shouldCache) return;

  // Cache-first 策略：命中缓存直接返回，未命中走网络并缓存
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((resp) => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return resp;
      });
    })
  );
});
