const CACHE_NAME = 'emirati-protocol-v2';
const FILES_TO_CACHE = [
  './emirati_protocol.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './uae-anthem.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isHtml = event.request.mode === 'navigate' || url.pathname.endsWith('.html');

  if(isHtml){
    // شبكة أولاً لملف HTML، حتى تصلك آخر التحديثات فوراً عند توفر إنترنت
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // كاش أولاً للملفات الثابتة (أيقونات، صوت) لتوفير البيانات وسرعة التحميل
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});
