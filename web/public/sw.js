const CACHE_NAME = "douala-static-v1";
const STATIC_FILES = [
  "/icon-192.png",
  "/icon-512.png",
  "/icon.svg",
  "/manifest.webmanifest",
  "/theme-bootstrap.js",
  "/fonts/inter-latin-wght-normal.woff2",
];
const STATIC_PATH = /^\/(?:icon-(?:192|512)\.png|icon\.svg|manifest\.webmanifest|theme-bootstrap\.js|fonts\/[a-zA-Z0-9._-]+)$/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("douala-static-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.search ||
    request.headers.has("authorization") ||
    !STATIC_PATH.test(url.pathname)
  ) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok && !response.headers.has("set-cookie")) {
        event.waitUntil(
          caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone())),
        );
      }
      return response;
    })),
  );
});
