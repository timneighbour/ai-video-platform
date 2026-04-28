/**
 * WIZ AI Service Worker
 *
 * VERSION STRATEGY:
 * CACHE_VERSION is injected at build time by vite.config.ts using a Unix timestamp.
 * Every production build produces a unique version string, so old caches are always
 * purged on the first visit after a deploy — no manual bumping required.
 *
 * ASSET STRATEGY:
 * - HTML navigation requests: network-first (always fresh from server)
 * - JS / CSS chunks:          stale-while-revalidate (serve cached instantly, refresh in background)
 * - Images / media:           cache-first with network fallback
 * - API calls:                bypass (never cached)
 *
 * UPDATE FLOW:
 * When a new service worker activates, it posts { type: "SW_ACTIVATED" } to all open
 * clients. The app listens and shows a "New version available" banner.
 * When the user taps "Update", the app posts { type: "SKIP_WAITING" } back, the new
 * SW activates immediately, and the page reloads with the fresh bundle.
 */

// __SW_VERSION__ is replaced at build time by the Vite plugin in vite.config.ts.
// Falls back to a timestamp in development so hot-reloads still work.
/* global __SW_VERSION__ */
var CACHE_VERSION = (typeof __SW_VERSION__ !== "undefined") ? __SW_VERSION__ : ("dev-" + Date.now());
var CACHE_NAME = "wizai-" + CACHE_VERSION;

// Install: cache the HTML shell only
self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(["/", "/manifest.json"]);
    })
  );
  // Do NOT skipWaiting here — triggered only when user taps "Update now"
});

// Activate: delete all caches from previous deployments
self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.matchAll({ includeUncontrolled: true, type: "window" });
    }).then(function(clients) {
      clients.forEach(function(client) {
        client.postMessage({ type: "SW_ACTIVATED", version: CACHE_VERSION });
      });
      return self.clients.claim();
    })
  );
});

// Message: handle SKIP_WAITING from the update banner
self.addEventListener("message", function(event) {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Fetch: strategy by asset type
self.addEventListener("fetch", function(event) {
  var url = new URL(event.request.url);

  if (event.request.method !== "GET") return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/manus-storage/")) return;
  if (
    url.pathname.includes("/.vite/deps/") ||
    url.pathname.includes("/@fs/") ||
    url.pathname.includes("/@vite/") ||
    url.pathname.includes("/@id/") ||
    url.pathname.startsWith("/src/") ||
    url.pathname.startsWith("/node_modules/")
  ) return;

  // HTML: network-first
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).then(function(response) {
        if (response.ok) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
        }
        return response;
      }).catch(function() {
        return caches.match("/") || caches.match(event.request);
      })
    );
    return;
  }

  // JS/CSS: stale-while-revalidate
  // Neutralises the Bunny CDN 90-day max-age by always revalidating in the background.
  var isJsOrCss = (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.includes("/assets/")
  );

  if (isJsOrCss) {
    event.respondWith(
      caches.open(CACHE_NAME).then(function(cache) {
        return cache.match(event.request).then(function(cached) {
          var fetchPromise = fetch(event.request).then(function(networkResponse) {
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  // Everything else: cache-first with network fallback
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      return cached || fetch(event.request).then(function(response) {
        if (response.ok) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
        }
        return response;
      });
    })
  );
});
