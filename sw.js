var CACHE_NAME = "echelon-v0.67";
var ROOT = self.registration.scope;
var INDEX_URL = new URL("./index.html", ROOT).toString();
var MANIFEST_URL = new URL("./manifest.webmanifest", ROOT).toString();
var ICON_URL = new URL("./icon.png", ROOT).toString();

function cacheRequired(cache, url) {
  return fetch(url, { cache: "reload" }).then(function (response) {
    if (!response.ok) {
      throw new Error(url + " returned " + response.status);
    }
    return cache.put(url, response.clone());
  });
}

function cacheOptional(cache, url) {
  return fetch(url, { cache: "reload" }).then(function (response) {
    if (response.ok) {
      return cache.put(url, response.clone());
    }
    return undefined;
  }).catch(function () {
    return undefined;
  });
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cacheRequired(cache, INDEX_URL).then(function () {
        return Promise.all([
          cacheOptional(cache, MANIFEST_URL),
          cacheOptional(cache, ICON_URL)
        ]);
      });
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (name) {
        if (name.indexOf("echelon-") === 0 && name !== CACHE_NAME) {
          return caches.delete(name);
        }
        return Promise.resolve(false);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") {
    return;
  }

  var requestURL = new URL(event.request.url);
  if (requestURL.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).then(function (response) {
        if (response && response.ok) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(INDEX_URL, copy);
          });
        }
        return response;
      }).catch(function () {
        return caches.match(INDEX_URL).then(function (cached) {
          if (cached) {
            return cached;
          }
          return new Response("Echelon is not yet installed offline. Reconnect once and reload.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
          });
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) {
        return cached;
      }
      return fetch(event.request).then(function (response) {
        if (response && response.ok && (requestURL.pathname.endsWith("/icon.png") || requestURL.pathname.endsWith("/manifest.webmanifest"))) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, copy);
          });
        }
        return response;
      });
    })
  );
});
