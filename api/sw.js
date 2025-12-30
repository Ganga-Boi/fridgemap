/* FridgeMap Service Worker – SAFE BASELINE
 * - Bypasser ALLE /api/* requests
 * - Ingen cache, ingen interception
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 🔴 VIGTIGT: Bypass ALLE API-kald
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Default: lad browseren håndtere fetch normalt
});
