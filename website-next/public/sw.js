const CACHE_VERSION = "q3js-pwa-v1";
const DOCUMENT_CACHE = `${CACHE_VERSION}-documents`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const STATIC_ASSET_PATTERN = /\.(?:css|js|mjs|png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|otf|wasm)$/i;

self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames
                .filter((cacheName) => !cacheName.startsWith(CACHE_VERSION))
                .map((cacheName) => caches.delete(cacheName)),
        );
        await self.clients.claim();
    })());
});

self.addEventListener("fetch", (event) => {
    const {request} = event;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith(networkFirst(request, DOCUMENT_CACHE));
        return;
    }

    if (url.pathname.startsWith("/_next/") || STATIC_ASSET_PATTERN.test(url.pathname)) {
        event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
    }
});

async function networkFirst(request, cacheName) {
    const cache = await caches.open(cacheName);

    try {
        const response = await fetch(request);

        if (isCacheableResponse(response)) {
            await cache.put(request, response.clone());
        }

        return response;
    } catch {
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        return fetch(request);
    }
}

async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    const networkResponsePromise = fetch(request)
        .then(async (response) => {
            if (isCacheableResponse(response)) {
                await cache.put(request, response.clone());
            }

            return response;
        })
        .catch(() => null);

    if (cachedResponse) {
        return cachedResponse;
    }

    const networkResponse = await networkResponsePromise;

    if (networkResponse) {
        return networkResponse;
    }

    return fetch(request);
}

function isCacheableResponse(response) {
    return response.ok && (response.type === "basic" || response.type === "default");
}
