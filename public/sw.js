self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Bypass alle API-kald (ingen caching, ingen blokering)
  if (url.pathname.startsWith("/api/")) return;

  // Ingen caching ellers (stabil baseline)
});
