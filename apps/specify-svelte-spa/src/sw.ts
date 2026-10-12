/// <reference lib="webworker" />

// Объявляем тип для инжектируемого манифеста
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null } | string>;
};

const SW_DEBUG = false;
const SW_LOG_CACHE_HITS = false;
const SW_LOG_CACHE_PUTS = false;

const swLog = (message: string, data: any = null, level: "info" | "debug" = "info") => {
  if (!SW_DEBUG && level === "debug") return;
  console.log("SW:", message, data ?? "");
};

const swError = (message: string, error: any = null) => {
  console.error("SW ERROR:", message, error ?? "");
};

const precacheManifest = self.__WB_MANIFEST;
const version = `v-${(precacheManifest[0] as any)?.revision || Date.now()}`;

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Установка
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(version).then(async (cache) => {
      // Извлекаем только URL из манифеста и добавляем "/"
      const urlsToCache = precacheManifest.map(item => typeof item === 'string' ? item : item.url);
      return cache.addAll([...urlsToCache, "/"]);
    })
  );
});

// Активация
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== version) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event: FetchEvent) => {
  const url = new URL(event.request.url);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return;
  }

  // Белый список
  // Example /^\/docs(\/|$)/, /^\/awstats(\/|$)/, /\.pdf$/i
  const skipPaths = [/\.pdf$/i];
  if (skipPaths.some((re) => re.test(url.pathname))) {
    event.respondWith(fetch(event.request)); // просто в сеть, без кеша
    return;
  }

  // Offline fallback
  const wantsHtml =
    event.request.mode === "navigate" ||
    (event.request.headers.get("accept") || "").includes("text/html");

  if (wantsHtml) {
    event.respondWith(
      caches
        .match("/")
        .then((r) => r || fetch(event.request)),
    );
    return;
  }

  // Типы для кэширования
  const getResourceType = (request: Request) => {
    const destination = request.destination;
    const acceptHeader = request.headers.get("accept") || "";

    if (destination === "image" || acceptHeader.includes("image/")) {
      return "image";
    }
    if (
      destination === "font" || acceptHeader.includes("font/")
    ) {
      return "font";
    }
    if (destination === "script" || acceptHeader.includes("javascript")) {
      return "script";
    }
    if (destination === "style" || acceptHeader.includes("text/css")) {
      return "style";
    }
    return "other";
  };

  // Appwrite images from Storage
  const isAppwriteImage = (requestUrl: string) => {
    const url = new URL(requestUrl);
    return (
      url.pathname.includes("/storage/buckets/") &&
      url.pathname.includes("/preview")
    );
  };

  const shouldCache = (resourceType: string, response: Response, request: Request) => {
    const cacheableTypes = ["image", "font", "script", "style"];

    if (!cacheableTypes.includes(resourceType) || !response) {
      return false;
    }

    if (isAppwriteImage(request.url)) {
      swLog("Appwrite image detected, forcing cache", null, "debug");
      return (
        response.type === "opaque" ||
        (response.status >= 200 && response.status < 300)
      );
    }

    return response.status === 200;
  };

  const resourceType = getResourceType(event.request);

  event.respondWith(
    caches
      .match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          if (SW_LOG_CACHE_HITS) {
            swLog("Cache hit:", event.request.url);
          }
          return cachedResponse;
        }

        if (isAppwriteImage(event.request.url)) {
          swLog("Fetching Appwrite image with no-cors", null, "debug");

          const noCorsRequest = new Request(event.request.url, {
            method: "GET",
            mode: "no-cors",
            cache: "default",
            credentials: "omit",
          });

          return fetch(noCorsRequest)
            .then((networkResponse) => {
              if (shouldCache(resourceType, networkResponse, event.request)) {
                if (SW_LOG_CACHE_PUTS) {
                  swLog("Caching Appwrite image:", event.request.url);
                }

                const cloneResponse = networkResponse.clone();
                caches.open(version).then((cache) => {
                  cache.put(event.request, cloneResponse).catch((error) => {
                    swError("Cache put failed:", error);
                  });
                });
              }

              return networkResponse;
            })
            .catch((error) => {
              swError("Appwrite image fetch failed:", error);
              throw error;
            });
        }

        return fetch(event.request).then((networkResponse) => {
          if (shouldCache(resourceType, networkResponse, event.request)) {
            const cloneResponse = networkResponse.clone();
            caches.open(version).then((cache) => {
              cache.put(event.request, cloneResponse).catch((error) => {
                swError("Standard cache put failed:", error);
              });
            });
          }
          return networkResponse;
        });
      })
      .catch((error) => {
        swError("Cache match failed:", error);

        if (resourceType === "image") {
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>',
            {
              status: 200,
              statusText: "OK",
              headers: {
                "Content-Type": "image/svg+xml",
              },
            },
          );
        }

        throw error;
      }),
  );
});
