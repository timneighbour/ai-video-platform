/**
 * WIZ AI Service Worker — Self-Versioning Edition
 *
 * VERSION STRATEGY (Cloudflare-proof):
 * sw.js itself is cached by Cloudflare CDN for up to 90 days.
 * Build-time injection of __SW_VERSION__ cannot reach the CDN-cached copy.
 *
 * Solution: the SW derives its own CACHE_VERSION at runtime by fetching the
 * HTML page (which is always served with no-cache, no-store) and extracting
 * the content-hash fingerprint of the main JS bundle from it.
 *
 * Every deploy produces a new HTML with new chunk hashes. The SW detects the
 * change on its next check and purges old caches — even if sw.js itself is stale.
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

/* global self, caches, fetch, clients */
'use strict';

var CACHE_NAME_PREFIX = 'wizai-';

// ── Runtime version detection ────────────────────────────────────────────────
// Fetch the HTML shell with no-cache and extract the main JS chunk hash.
// The HTML is always served fresh (no-cache, no-store) so this always reflects
// the current deployment, regardless of how stale sw.js itself may be.
function detectVersion() {
  return fetch('/?_sw_ver=' + Date.now(), { cache: 'no-store' })
    .then(function(res) { return res.text(); })
    .then(function(html) {
      // Extract the fingerprinted main entry chunk, e.g. assets/index-DdUuvEt0.js
      var match = html.match(/assets\/index-([A-Za-z0-9_\-]+)\.js/);
      if (match && match[1]) {
        return match[1]; // e.g. "DdUuvEt0"
      }
      // Fallback: use any hashed chunk fingerprint
      var anyChunk = html.match(/assets\/[A-Za-z0-9_\-]+-([A-Za-z0-9_\-]{8,})\.js/);
      if (anyChunk && anyChunk[1]) {
        return anyChunk[1];
      }
      return String(Date.now());
    })
    .catch(function() {
      return String(Date.now());
    });
}

// Track whether this is a first install (no previous SW) or an update
var isFirstInstall = false;

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', function(event) {
  // If there's no existing controller, this is a first install
  if (!self.registration.active) {
    isFirstInstall = true;
  }
  event.waitUntil(
    detectVersion().then(function(version) {
      var cacheName = CACHE_NAME_PREFIX + version;
      console.log('[SW] Installing with cache:', cacheName);
      return caches.open(cacheName).then(function(cache) {
        return cache.add('/');
      });
    })
  );
});

// ── Activate — purge old caches ───────────────────────────────────────────────
self.addEventListener('activate', function(event) {
  event.waitUntil(
    detectVersion().then(function(version) {
      var cacheName = CACHE_NAME_PREFIX + version;
      console.log('[SW] Activating with cache:', cacheName);
      return caches.keys().then(function(keys) {
        return Promise.all(
          keys
            .filter(function(k) { return k.startsWith(CACHE_NAME_PREFIX) && k !== cacheName; })
            .map(function(k) {
              console.log('[SW] Deleting old cache:', k);
              return caches.delete(k);
            })
        );
      }).then(function() {
        return self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
      }).then(function(allClients) {
        // Only show the update banner if this is an update, not a first install
        if (!isFirstInstall) {
          allClients.forEach(function(client) {
            client.postMessage({ type: 'SW_ACTIVATED', version: cacheName });
          });
        }
        return self.clients.claim();
      });
    })
  );
});

// ── Message handler — SKIP_WAITING ───────────────────────────────────────────
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Fetch strategy ───────────────────────────────────────────────────────────
self.addEventListener('fetch', function(event) {
  var url;
  try {
    url = new URL(event.request.url);
  } catch (e) {
    return;
  }

  if (event.request.method !== 'GET') return;

  // Never intercept API calls, OAuth, tRPC, Stripe, or Manus storage
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/manus-storage/') ||
    url.hostname.includes('stripe.com') ||
    url.hostname.includes('manus.im') ||
    url.pathname.includes('/.vite/') ||
    url.pathname.includes('/@fs/') ||
    url.pathname.includes('/@vite/') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/')
  ) {
    return;
  }

  // HTML navigation — network-first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(function(response) {
          if (response && response.ok) {
            detectVersion().then(function(version) {
              var cacheName = CACHE_NAME_PREFIX + version;
              caches.open(cacheName).then(function(cache) {
                cache.put(event.request, response.clone());
              });
            });
          }
          return response;
        })
        .catch(function() {
          return caches.match('/');
        })
    );
    return;
  }

  // JS / CSS — stale-while-revalidate
  var isJsOrCss = (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.includes('/assets/')
  );

  if (isJsOrCss) {
    event.respondWith(
      detectVersion().then(function(version) {
        var cacheName = CACHE_NAME_PREFIX + version;
        return caches.open(cacheName).then(function(cache) {
          return cache.match(event.request).then(function(cached) {
            var networkFetch = fetch(event.request).then(function(networkResponse) {
              if (networkResponse && networkResponse.ok) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            }).catch(function() { return cached; });
            return cached || networkFetch;
          });
        });
      })
    );
    return;
  }

  // Images and media — cache-first with network fallback
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(response) {
        if (response && response.ok) {
          detectVersion().then(function(version) {
            var cacheName = CACHE_NAME_PREFIX + version;
            caches.open(cacheName).then(function(cache) {
              cache.put(event.request, response.clone());
            });
          });
        }
        return response;
      });
    })
  );
});
