// إرث – Service Worker
// CACHE_VERSION يتغير تلقائيًا مع كل إصدار (أداة البناء تكتبه)، فتصل التحديثات للمستخدمين.
const CACHE_VERSION = 'a91fffec3d';
const CACHE_NAME = 'irth-' + CACHE_VERSION;

// ملفات لازمة لفتح التطبيق دون اتصال
const REQUIRED_FILES = [
  './',
  './index.html',
  './manifest.json'
];
// ملفات مفيدة؛ فشل أي منها لا يوقف التثبيت
const OPTIONAL_FILES = [
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './uae-anthem.mp3',
  './privacy.html',
  './firebase-app-compat.js',
  './firebase-auth-compat.js',
  './firebase-firestore-compat.js',
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
  './tajawal-arabic-700-normal.woff2',
  './qrcode-generator.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(REQUIRED_FILES).then(() =>
        Promise.all(OPTIONAL_FILES.map((f) => cache.add(f).catch(() => null)))
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('irth-') && k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// الصوت والفيديو يطلبان أجزاء من الملف (Range)؛ نعيد الجزء المطلوب من النسخة المحفوظة
async function rangeResponse(request, cached){
  const range = request.headers.get('range');
  const buf = await cached.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(range || '');
  if(!m) return new Response(buf, { status: 200, headers: cached.headers });
  const size = buf.byteLength;
  const start = m[1] ? parseInt(m[1], 10) : Math.max(0, size - parseInt(m[2], 10));
  const end = (m[1] && m[2]) ? Math.min(parseInt(m[2], 10), size - 1) : size - 1;
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': cached.headers.get('Content-Type') || 'application/octet-stream',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes'
    }
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;                       // لا نتدخل في طلبات الكتابة
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;         // Firebase وخدمات Google تمر مباشرة

  const isHtml = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  if (isHtml) {
    // الشبكة أولًا لملفات HTML حتى تصل آخر نسخة، والنسخة المحفوظة عند انقطاع الاتصال
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // الملفات الثابتة: من الذاكرة أولًا، ثم الشبكة
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      if (cached) return req.headers.has('range') ? rangeResponse(req, cached) : cached;
      return fetch(req);
    })
  );
});

// الضغط على إشعار المناسبة يفتح التطبيق
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      return self.clients.openWindow('./');
    })
  );
});
