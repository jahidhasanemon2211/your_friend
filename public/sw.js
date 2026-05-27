const CACHE_NAME = "pwa-chat-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/src/main.tsx",
  "/src/App.tsx",
  "/src/index.css",
  "/src/types.ts",
  "/favicon.ico"
];

// Install Event: cache static shell assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("PWA Service Worker caching static shell assets");
      return cache.addAll(ASSETS).catch((err) => {
        console.warn("Service worker precache warning:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event: clear old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("PWA Service Worker clearing old cache:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: intercept network calls
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Do not intercept or cache any backend APIs or hot-reloading streams
  if (url.pathname.startsWith("/api") || ioRegexTest(url.pathname)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
            return networkResponse;
          }

          // Dynamically cache visited safe styles/script files
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // Soft offline fallbacks for media
          if (event.request.destination === "image") {
            return new Response('<svg xmlns="http://www.w3.org/2000/svg" w="100" h="100" fill="#ddd"></svg>', {
              headers: { "Content-Type": "image/svg+xml" }
            });
          }
        });
    })
  );
});

function ioRegexTest(path) {
  return path.includes("socket.io") || path.includes("events");
}
