/* Offline-Speicher der Web-App. Die Version wird beim Bauen eingesetzt; eine neue Version ersetzt den alten Speicher.
   Seiten (HTML): zuerst aus dem Netz, damit eine ersetzte Datei sofort gilt; ohne Netz aus dem Speicher.
   Übrige Dateien: zuerst aus dem Speicher, im Hintergrund nachladen.
   «sw.js?nur=ausweis» (Mitglied öffnet den eigenen Ausweis): nur die Ausweis-Seite vorab speichern, nicht die ganze Web-App. */
var V = 'fvs-20770cac36f8', DATEIEN = ["./", "index.html", "datenschutz.html", "vorlagen.html", "manifest.webmanifest", "assets/icon-180.png", "assets/icon-192.png", "assets/icon-512.png", "ausweis.html", "pruefen.html"];
var NUR_AUSWEIS = new URL(self.location.href).searchParams.get('nur') === 'ausweis';
var VORAB = NUR_AUSWEIS ? ['ausweis.html', 'pruefen.html', 'datenschutz.html'] : DATEIEN;
self.addEventListener('install', function (e) {
  // Jede Datei einzeln: Fehlt eine oder fällt sie beim Laden aus (schlechter Empfang), kommt sie beim nächsten Aufruf in den Speicher
  e.waitUntil(caches.open(V).then(function (c) { return Promise.all(VORAB.map(function (d) { return c.add(d).catch(function () {}); })); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (k) { return Promise.all(k.filter(function (x) { return x !== V; }).map(function (x) { return caches.delete(x); })); })
    .then(function () { return self.clients.claim(); }));
});
function istSeite(req) { return req.mode === 'navigate' || req.destination === 'document' || /\.html$|\/$/.test(new URL(req.url).pathname); }
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(V).then(function (c) {
    if (istSeite(e.request)) {
      // Netz zuerst, nach 4 Sekunden ohne Antwort aus dem Speicher (z. B. im Keller ohne Empfang)
      return new Promise(function (fertig) {
        var erledigt = false, alt = null;
        function gib(a) { if (!erledigt && a) { erledigt = true; fertig(a); } }
        c.match(e.request, { ignoreSearch: true }).then(function (a) { alt = a; });
        var t = setTimeout(function () { c.match(e.request, { ignoreSearch: true }).then(gib); }, 4000);
        fetch(e.request).then(function (a) { if (a.ok) c.put(e.request, a.clone()); clearTimeout(t); gib(a); })
          .catch(function () { clearTimeout(t); c.match(e.request, { ignoreSearch: true }).then(function (a) { gib(a || alt || Response.error()); }); });
      });
    }
    return c.match(e.request, { ignoreSearch: true }).then(function (alt) {
      var netz = fetch(e.request).then(function (a) { if (a.ok) c.put(e.request, a.clone()); return a; }).catch(function () { return alt; });
      return alt || netz;
    });
  }));
});
