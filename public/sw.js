// __BUILD_ID__ is replaced at build time with a hash of the build (vite.config.ts), so
// every deploy installs a fresh worker and the activate step drops the old cache.
const SHELL_CACHE = "qibla-line-shell-__BUILD_ID__";
const STATIC_FILES = ["/manifest.webmanifest", "/icons/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png"];
// Pages that open the app or the landing page, and the cache key each is kept under
const PAGE_KEYS = { "/": "/", "/app": "/", "/about": "/about" };
const NETWORK_TIMEOUT_MS = 4000;

function getShellAssetUrls(html) {
  const matches = html.matchAll(/(?:href|src)="([^"]+)"/g);
  return [...matches]
    .map((match) => match[1])
    .filter((url) => url.startsWith("/assets/"));
}

function isHtml(response) {
  return (response.headers.get("content-type") ?? "").includes("text/html");
}

async function cacheShell() {
  const cache = await caches.open(SHELL_CACHE);
  const response = await fetch("/", { cache: "no-cache" });
  if (!response.ok || !isHtml(response)) throw new Error("App shell is unavailable");
  const html = await response.clone().text();

  // The app is loaded with a dynamic import, so its chunks are not named in the HTML.
  // The build writes them all to shell-assets.json.
  const built = await fetch("/shell-assets.json", { cache: "no-cache" })
    .then((list) => (list.ok ? list.json() : []))
    .catch(() => []);

  const urls = [...new Set([...STATIC_FILES, ...getShellAssetUrls(html), ...built])];
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

// App and landing pages: fresh HTML when the network answers in time, the cached copy
// otherwise. Only these pages are cached, each under its own key, so opening
// /llms.txt or a mistyped URL can never replace the app shell.
async function networkFirst(request, key) {
  const cache = await caches.open(SHELL_CACHE);

  try {
    const response = await fetchWithTimeout(request);
    if (response.ok && isHtml(response)) {
      await cache.put(key, response.clone());
      return response;
    }
    if (response.ok) return response;
  } catch {
    // Offline or too slow: fall through to the cached copy
  }

  return (await cache.match(key)) ?? (await cache.match("/")) ?? fetch(request);
}

// Hashed build assets (including font files pulled in by CSS) never change, so keep a
// copy of each the first time it is used. Never store HTML under an asset URL: a chunk
// removed by a later deploy comes back as the 200 index.html fallback.
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && !isHtml(response)) {
    const cache = await caches.open(SHELL_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

// The manifest and icons keep their names between deploys, so refresh them in the background
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

  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (event.request.mode === "navigate" && path in PAGE_KEYS) {
    event.respondWith(networkFirst(event.request, PAGE_KEYS[path]));
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  if (STATIC_FILES.includes(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event));
  }
});
