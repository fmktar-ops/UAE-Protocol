const CACHE_NAME = 'irth-v4';
const FILES_TO_CACHE = [
  './emirati_protocol.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './uae-anthem.mp3',
  './privacy.html',
  './firebase-app-compat.js',
  './firebase-auth-compat.js',
  './firebase-firestore-compat.js'
];
const OPTIONAL_FILES = [
  './aref-ruqaa-arabic-700-normal.woff2',
  './noto-naskh-arabic-arabic-500-normal.woff2',
  './noto-naskh-arabic-arabic-700-normal.woff2',
  './alexandria-arabic-500-normal.woff2',
  './alexandria-arabic-600-normal.woff2',
  './alexandria-arabic-700-normal.woff2',
  './alexandria-arabic-800-normal.woff2',
  './noto-kufi-arabic-arabic-400-normal.woff2',
  './noto-kufi-arabic-arabic-600-normal.woff2',
  './noto-kufi-arabic-arabic-700-normal.woff2',
  './noto-kufi-arabic-arabic-800-normal.woff2',
  './tajawal-arabic-400-normal.woff2',
  './tajawal-arabic-500-normal.woff2',
  './tajawal-arabic-700-normal.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(FILES_TO_CACHE).then(() => Promise.all(OPTIONAL_FILES.map((f) => cache.add(f).catch(() => null))))
    )
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
