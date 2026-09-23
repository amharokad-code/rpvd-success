/* Service worker RPVD Success (contrat §3 PWA).
   - Précache du shell à l'installation.
   - Navigations : réseau d'abord, repli sur le shell en cache (hors ligne).
   - Autres GET same-origin (/assets/*, icônes) : stale-while-revalidate.
   - Jamais d'interception des API : /.netlify/functions/*, Supabase, Stripe, Google. */

const CACHE_VERSION = 'v2'
const CACHE_NAME = `rpvd-${CACHE_VERSION}`

const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
]

// Hôtes et chemins qu'on laisse toujours passer au réseau sans y toucher.
const BYPASS_PATH_PREFIXES = ['/.netlify/']
const BYPASS_HOST_FRAGMENTS = ['supabase', 'stripe', 'googleapis', 'gstatic']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // `addAll` échoue si une ressource manque : on précache une par une pour rester tolérant.
      .then((cache) => Promise.all(SHELL_URLS.map((url) => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

function shouldBypass(url) {
  if (url.origin !== self.location.origin) return true
  if (BYPASS_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return true
  return BYPASS_HOST_FRAGMENTS.some((fragment) => url.hostname.includes(fragment))
}

// Réseau d'abord pour les pages : on garde le shell à jour, avec repli hors ligne.
async function networkFirstShell(request) {
  const cache = await caches.open(CACHE_NAME)
  try {
    const response = await fetch(request)
    if (response && response.ok) cache.put('/index.html', response.clone())
    return response
  } catch {
    const cached = (await cache.match('/index.html')) || (await cache.match('/'))
    return cached || Response.error()
  }
}

// Stale-while-revalidate : on sert le cache tout de suite et on rafraîchit en arrière-plan.
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => null)
  if (cached) return cached
  const response = await network
  return response || Response.error()
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (shouldBypass(url)) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstShell(request))
    return
  }
  event.respondWith(staleWhileRevalidate(request))
})
