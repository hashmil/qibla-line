const SHELL_CACHE = "qibla-line-shell-v3";
const SHELL_ASSETS = ["/", "/manifest.webmanifest", "/icons/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png"];

function getShellAssetUrls(html) {
  const matches = html.matchAll(/(?:href|src)="([^"]+)"/g);
  return [...matches]
    .map((match) => match[1])
    .filter((url) => url.startsWith("/assets/"));
}

async function cacheShell() {
  const cache = await caches.open(SHELL_CACHE);
  const response = await fetch("/");
  const html = await response.clone().text();
  await cache.put("/", response);

  const urls = [...new Set([...SHELL_ASSETS.filter((url) => url !== "/"), ...getShellAssetUrls(html)])];
  await cache.addAll(urls);
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

async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put("/", response.clone());
    }
    return response;
  } catch {
    return (await cache.match(request)) ?? (await cache.match("/")) ?? Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  return fetch(request);
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

  if (SHELL_ASSETS.includes(url.pathname) || url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  event.respondWith(fetch(event.request));
});
