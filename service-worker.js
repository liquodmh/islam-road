const CACHE_NAME = "islam-app-v1";
// هنا نضع قائمة الملفات التي نريد حفظها لتعمل بدون نت
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icon-192.png", // ✅ تم إزالة //
  "./icon-512.png"  // ✅ تم إزالة //
];

// 1. مرحلة التنصيب (Install): حفظ الملفات في الكاش
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("تم حفظ ملفات التطبيق في الكاش");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. مرحلة الجلب (Fetch): تقديم الملفات من الكاش إذا لم يتوفر نت
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // إذا الملف موجود في الكاش، رجعه. إذا لا، اطلبه من النت
      return response || fetch(event.request);
    })
  );
});

// 3. تنظيف الكاش القديم عند تحديث التطبيق
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});