/* FridgeMap Service Worker – SAFE BASELINE
 * - Bypasser ALLE /api/* requests (ingen cache, ingen interception)
 * - Cacher kun statiske filer via browserens normale mekanismer
 * - Ingen aggressive cache-strategier
 */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 🔴 VIGTIGT: Bypass ALLE API-kald
  if (url.pathname.startsWith("/api/")) {
    return; // lad browseren gå direkte til netværket
  }

  // 🔹 Default: lad browseren håndtere fetch normalt
  // (ingen custom cache her – bevidst)
});
