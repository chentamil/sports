// Service worker for Shivani Elite Academy Admin.
//
// Deliberately does NOT cache anything under /api/ — this is a live business
// app (students, payments, attendance), so API responses must always come
// from the network, never a cached copy. Only static assets (JS modules,
// icons, CSS) are cached, purely to make repeat loads faster and give the
// app shell basic offline availability.

const CACHE_NAME = "sea-admin-v1";

const STATIC_ASSETS = [
  "/superadmin.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/js/core.js",
  "/js/auth.js",
  "/js/slots.js",
  "/js/slots-bulk-actions.js",
  "/js/slots-mobile-generator.js",
  "/js/coaches.js",
  "/js/batches.js",
  "/js/attendance.js",
  "/js/students.js",
  "/js/announcements.js",
  "/js/plans.js",
  "/js/memberships.js",
  "/js/payments.js",
  "/js/dropdown-helpers.js",
  "/js/expenses.js",
  "/js/financial-dashboard.js",
  "/js/dashboard.js",
  "/js/reports.js",
  "/js/notifications.js",
  "/js/audit.js",
  "/js/bookings.js",
  "/js/back-to-top.js",
  "/js/main.js"
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Best-effort — don't block install if one asset 404s
      Promise.allSettled(STATIC_ASSETS.map((url) => cache.add(url)))
    )
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Never touch API requests — always go straight to the network.
  if (url.pathname.startsWith("/api/")) {
    return; // let the browser handle it normally, no respondWith at all
  }

  // Static assets: cache-first, falling back to network (and caching the result).
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((response) => {
        if (response.ok && e.request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      });
    })
  );
});
