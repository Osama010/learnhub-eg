/* عامل الخدمة لمنصة المستر — خلي التطبيق يفتح حتى من غير نت (الشيل الثابت).
   شبكة-أولاً عشان أي نسخة جديدة توصل فورًا، والكاش احتياطي وقت انقطاع النت. */
const CACHE = "elmoster-v5";
const SHELL = ["./index.html", "./style.css", "./app.js", "./auth.js", "./admin.js", "./teacher.js", "./student.js", "./firebase-config.js", "./logo-icon.svg", "./logo-full.svg", "./icon-192.png", "./icon-512.png", "./manifest.webmanifest", "./student/", "./teacher/", "./admin/", "./student/manifest.webmanifest", "./teacher/manifest.webmanifest", "./admin/manifest.webmanifest"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  // فايربيز وأي مصدر خارجي: شبكة مباشرة من غير كاش
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
