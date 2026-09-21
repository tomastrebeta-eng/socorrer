/* Service worker de SOCORRER — cachea el app-shell para instalación PWA y uso offline básico.
   Los datos siguen viniendo en vivo de Firestore (peticiones cross-origin no se interceptan). */
const CACHE = "socorrer-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Dejar pasar a la red todo lo que no sea del mismo origen (Firebase, gstatic, Google Fonts).
  if (url.origin !== self.location.origin) return;

  // Navegaciones: red primero, con index.html cacheado como respaldo offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return r; })
        .catch(() => caches.match("./index.html").then((m) => m || caches.match("./")))
    );
    return;
  }

  // Resto de estáticos del mismo origen: cache primero, luego red.
  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((r) => {
      const cp = r.clone();
      caches.open(CACHE).then((c) => c.put(req, cp));
      return r;
    }).catch(() => cached))
  );
});
