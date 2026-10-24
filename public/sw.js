// __BUILD_ID__ is replaced at build time (see vite.config.ts), so every deploy
// installs a fresh worker and clears the previous shell cache.
const SHELL_CACHE = "qibla-line-shell-__BUILD_ID__";
const SHELL_ASSETS = ["/", "/manifest.webmanifest", "/icons/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png"];
const NETWORK_TIMEOUT_MS = 4000;

function getShellAssetUrls(html) {
  const matches = html.matchAll(/(?:href|src)="([^"]+)"/g);
  return [...matches]
    .map((match) => match[1])
    .filter((url) => url.startsWith("/assets/"));
}

async function cacheShell() {
  const cache = await caches.open(SHELL_CACHE);
  const response = await fetch("/", { cache: "no-cache" });
  if (!response.ok) throw new Error(`Shell request failed with ${response.status}`);

  const html = await response.clone().text();
  const urls = [...new Set([...SHELL_ASSETS.filter((url) => url !== "/"), ...getShellAssetUrls(html)])];
  await cache.addAll(urls);
  await cache.put("/", response);
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("qibla-line-") && key !== SHELL_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function fetchWithTimeout(request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

// Navigations: fresh HTML when the network answers in time, cached shell otherwise.
async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);

  try {
    const response = await fetchWithTimeout(request);
    if (response.ok) {
      await cache.put("/", response.clone());
      return response;
    }
  } catch {
    // Offline or too slow: fall through to the cached shell.
  }

  return (await cache.match("/")) ?? fetch(request);
}

// Hashed build assets never change, so cache them the first time they load.
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(SHELL_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

// Manifest and icons keep their names between deploys, so refresh them in the background.
async function staleWhileRevalidate(event) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(event.request);
  const refresh = fetch(event.request)
    .then(async (response) => {
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    })
    .catch(() => undefined);

  if (cached) {
    event.waitUntil(refresh);
    return cached;
  }

  return (await refresh) ?? Response.error();
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate" || event.request.destination === "document") {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  if (SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event));
  }
});
