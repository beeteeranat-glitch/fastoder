const CACHE_NAME = "fastorder-shell-v2";
const SHELL = ["/", "/menu", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // ลบ cache เวอร์ชันเก่าทิ้ง กัน HTML/chunk เก่าค้างจนเกิด ChunkLoadError
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Next.js chunks และ API ต้องใช้ network เสมอ — ห้าม cache-first
  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // หน้า HTML (navigation) ใช้ network-first เพื่อให้ได้ markup ใหม่ที่อ้างอิง chunk ปัจจุบันเสมอ
  // ถ้า offline ค่อย fallback ไป cache — ป้องกัน HTML เก่าอ้างอิง chunk ที่ถูกลบไปแล้ว
  const isNavigation =
    request.mode === "navigate" ||
    (request.headers.get("accept") ?? "").includes("text/html");

  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && request.url.startsWith(self.location.origin)) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) ?? (await caches.match("/"))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          const copy = response.clone();
          if (request.url.startsWith(self.location.origin) && response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match("/"));
    }),
  );
});

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? "FastOrder";
  const options = {
    body: data.body ?? "มีอัปเดตออเดอร์",
    tag: data.tag ?? "fastorder-push",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
