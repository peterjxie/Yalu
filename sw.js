var CACHE_NAME = "echelon-v0.66";
var INDEX_URL = new URL("./index.html", self.registration.scope).toString();

self.addEventListener("install", function (event) {
  event.waitUntil(
    fetch(INDEX_URL, { cache: "reload" }).then(function (response) {
      if (!response.ok) { throw new Error("Echelon index returned " + response.status); }
      return caches.open(CACHE_NAME).then(function (cache) {
        return cache.put(INDEX_URL, response.clone());
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
  if (event.request.method !== "GET") { return; }
  var requestURL = new URL(event.request.url);
  if (requestURL.origin !== self.location.origin) { return; }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).then(function (response) {
        if (response && response.ok) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(INDEX_URL, copy); });
        }
        return response;
      }).catch(function () {
        return caches.match(INDEX_URL).then(function (cached) {
          if (cached) { return cached; }
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
      return cached || fetch(event.request);
    })
  );
});
