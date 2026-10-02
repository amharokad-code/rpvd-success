/* Service worker de retrait : le site n'est plus une PWA. Les navigateurs qui ont encore l'ancien
   sw.js le mettent à jour avec ce fichier, qui vide les caches et se désinscrit. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister()),
  );
});
