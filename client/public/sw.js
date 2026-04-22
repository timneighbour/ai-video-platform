/**
 * WIZ AI Service Worker
 * Provides offline support and caching for PWA functionality.
 */

const CACHE_NAME = "wizai-v1";

// Core shell assets to cache on install
const SHELL_ASSETS = [
  "/",
  "/manifest.json",
];

// Install — cache shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network-first for API calls, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and API calls
  if (event.request.method !== "GET") return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/manus-storage/")) return;

  // For navigation requests (HTML pages) — network first, fallback to cache
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache a copy of the response
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match("/") || caches.match(event.request))
    );
    return;
  }

  // For static assets — cache first, then network
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
    )
  );
});
