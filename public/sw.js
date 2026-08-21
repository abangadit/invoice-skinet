const CACHE_NAME = "invoice-co-id-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/manifest.json",
  "/icon.svg"
];

// Install Event
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event
self.addEventListener("fetch", (e) => {
  // Only handle HTTP/HTTPS, skip extension schemes like chrome-extension
  if (!e.request.url.startsWith("http")) return;

  // Network-First strategy for HTML document navigations (like root "/" or other pages)
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          // If successful, cache the fresh document
          if (networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback: try to serve the requested page from cache, or fall back to "/"
          return caches.match(e.request).then((cachedResponse) => {
            return cachedResponse || caches.match("/");
          });
        })
    );
    return;
  }

  // Cache-First strategy for static assets
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((networkResponse) => {
        // Cache dynamic assets if appropriate (next static chunks, images)
        if (
          networkResponse.status === 200 &&
          e.request.method === "GET" &&
          (e.request.url.includes("/_next/static/") || e.request.url.includes("/images/"))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback
        return caches.match("/");
      });
    })
  );
});
