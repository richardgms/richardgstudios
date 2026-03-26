// Service Worker — Richard G Studios
// Self-contained, sem dependências de CDN externo

const CACHE_VERSION = "v4";
const CACHES = {
  static: `rg-static-${CACHE_VERSION}`,
  images: `rg-images-${CACHE_VERSION}`,
  fonts: `rg-fonts-${CACHE_VERSION}`,
  pages: `rg-pages-${CACHE_VERSION}`,
};

const OFFLINE_URL = "/offline";

// ── Install: pré-cache da página offline (não-bloqueante) ────────────────────
self.addEventListener("install", (event) => {
  // Tenta cachear /offline mas não falha o install se não conseguir
  caches
    .open(CACHES.pages)
    .then((cache) => cache.add(OFFLINE_URL))
    .catch(() => {});
  event.waitUntil(self.skipWaiting());
});

// ── Activate: limpa caches antigos ───────────────────────────────────────────
self.addEventListener("activate", (event) => {
  const validCaches = new Set(Object.values(CACHES));
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !validCaches.has(k))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requests não-http (chrome-extension, etc.)
  if (!url.protocol.startsWith("http")) return;

  // API routes → sem cache
  if (url.pathname.startsWith("/api/")) return;

  // Assets estáticos do Next.js → StaleWhileRevalidate
  // Next.js usa content hashing, então URLs novas = cache miss automático.
  // SWR garante resposta rápida do cache + atualização em background.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/favicon.ico" ||
    url.pathname === "/apple-touch-icon.png"
  ) {
    event.respondWith(staleWhileRevalidate(request, CACHES.static));
    return;
  }

  // Imagens _next/image → StaleWhileRevalidate
  if (url.pathname.startsWith("/_next/image")) {
    event.respondWith(staleWhileRevalidate(request, CACHES.images));
    return;
  }

  // Imagens geradas em /storage/ → NetworkFirst
  if (url.pathname.startsWith("/storage/")) {
    event.respondWith(networkFirst(request, CACHES.images));
    return;
  }

  // Fontes Google → StaleWhileRevalidate
  if (
    url.origin === "https://fonts.googleapis.com" ||
    url.origin === "https://fonts.gstatic.com"
  ) {
    event.respondWith(staleWhileRevalidate(request, CACHES.fonts));
    return;
  }

  // Navegação (HTML) → NetworkFirst com fallback offline
  if (request.mode === "navigate") {
    event.respondWith(navigateFetch(request));
    return;
  }
});

// ── Estratégias ───────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return Response.error();
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  return cached || fetchPromise;
}

async function navigateFetch(request) {
  try {
    return await fetch(request);
  } catch {
    const cached = await caches.match(OFFLINE_URL);
    return cached || Response.error();
  }
}
