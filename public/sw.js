// Service Worker — Richard G Studios
// Usando Workbox de CDN para máxima compatibilidade com Turbopack/Next.js 16

importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/7.1.0/workbox-sw.js"
);

// Força Workbox a usar o SW como módulo de cache
workbox.setConfig({ debug: false });

const { StaleWhileRevalidate, CacheFirst, NetworkFirst } = workbox.strategies;
const { registerRoute, setCatchHandler } = workbox.routing;
const { ExpirationPlugin } = workbox.expiration;
const { precacheAndRoute } = workbox.precaching;

// Pre-cache da página offline
precacheAndRoute([{ url: "/offline", revision: "1" }]);

// Assets estáticos do Next.js (_next/static) → CacheFirst
registerRoute(
  ({ url }) => url.pathname.startsWith("/_next/static/"),
  new CacheFirst({
    cacheName: "next-static",
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
);

// Imagens do next/image → CacheFirst
registerRoute(
  ({ url }) => url.pathname.startsWith("/_next/image"),
  new CacheFirst({
    cacheName: "next-image",
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// Fontes Google → StaleWhileRevalidate
registerRoute(
  ({ url }) =>
    url.origin === "https://fonts.googleapis.com" ||
    url.origin === "https://fonts.gstatic.com",
  new StaleWhileRevalidate({
    cacheName: "google-fonts",
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
);

// Ícones e assets públicos → CacheFirst
registerRoute(
  ({ url }) =>
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/apple-touch-icon.png" ||
    url.pathname === "/favicon.ico",
  new CacheFirst({
    cacheName: "public-assets",
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// Imagens geradas em /storage/ → NetworkFirst
registerRoute(
  ({ url }) => url.pathname.startsWith("/storage/"),
  new NetworkFirst({
    cacheName: "generated-images",
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
);

// Rotas de API → NetworkOnly (nunca cacheadas)
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/"),
  new workbox.strategies.NetworkOnly()
);

// Fallback para documentos offline
setCatchHandler(async ({ event }) => {
  if (event.request.destination === "document") {
    return caches.match("/offline") || Response.error();
  }
  return Response.error();
});

// Ativa o SW imediatamente sem esperar o reload
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});
