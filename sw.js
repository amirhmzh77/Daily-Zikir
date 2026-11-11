const CACHE = "zikir-v4";
const FILES = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./icon-180.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(FILES);
    for (const a of ["./azan-makkah.mp3", "./azan-2.mp3", "./azan-3.mp3", "./azan-subuh.mp3"]) { try { await c.add(a); } catch (_) {} }
  }));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window" }).then(cs => cs.length ? cs[0].focus() : clients.openWindow("./index.html")));
});
self.addEventListener("fetch", e => {
  if (!e.request.url.startsWith(self.location.origin)) return; // let API calls go straight to network
  if (e.request.url.endsWith(".mp3")) { // serve audio from cache with Range support (needed by iOS)
    e.respondWith(caches.match(e.request.url).then(async r => {
      if (!r) return fetch(e.request);
      const buf = await r.arrayBuffer(), range = e.request.headers.get("range");
      if (!range) return new Response(buf, { status: 200, headers: { "Content-Type": "audio/mpeg", "Content-Length": buf.byteLength, "Accept-Ranges": "bytes" } });
      const m = /bytes=(\d+)-(\d*)/.exec(range), start = +m[1], end = m[2] ? Math.min(+m[2], buf.byteLength - 1) : buf.byteLength - 1;
      return new Response(buf.slice(start, end + 1), { status: 206, headers: { "Content-Type": "audio/mpeg", "Content-Range": `bytes ${start}-${end}/${buf.byteLength}`, "Content-Length": end - start + 1, "Accept-Ranges": "bytes" } });
    }));
    return;
  }
  e.respondWith(
    fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request))
  );
});
