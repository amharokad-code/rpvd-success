// Point d'entrée React : monte l'application et enregistre le service worker en production.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import LegalPage from './pages/LegalPage'
import LegalContactPage from './pages/LegalContactPage'
import BootcampPage from './pages/BootcampPage'
import AccueilPage from './pages/AccueilPage'
import './index.css'

// Routage minimal (pas de react-router) :
//   /          page principale Bootcamp (Académie RPVD)
//   /accueil   présentation de la méthode (ancienne landing)
//   /app       l'application (connexion par lien magique, puis dashboard)
//   /legal/*   pages statiques indépendantes
const LEGAL_DOCS = ['privacy', 'terms', 'cookies', 'refunds']
function legalDocFromPath() {
  if (typeof window === 'undefined') return null
  const match = window.location.pathname.match(/^\/legal\/([a-z]+)/)
  return match && LEGAL_DOCS.includes(match[1]) ? match[1] : null
}
function isLegalContactPath() {
  return typeof window !== 'undefined' && window.location.pathname === '/legal/contact'
}

// Retours qui doivent atterrir dans l'app et non sur la page Bootcamp : retour du lien magique
// Supabase (jetons dans le hash ou ?code=), ou app PWA installée lancée depuis l'écran d'accueil.
function shouldRedirectRootToApp() {
  if (typeof window === 'undefined') return false
  const { hash, search } = window.location
  const authCallback = /access_token=|refresh_token=|error_description=|type=magiclink/.test(hash) || /[?&]code=/.test(search)
  let standalone = false
  try {
    standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  } catch {
    standalone = false
  }
  return authCallback || standalone
}

function pickRoute() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/') {
    if (shouldRedirectRootToApp()) {
      window.location.replace(`/app${window.location.search}${window.location.hash}`)
      return null
    }
    return <BootcampPage />
  }
  if (path === '/bootcamp') return <BootcampPage />
  if (path === '/accueil') return <AccueilPage />
  if (isLegalContactPath()) return <LegalContactPage />
  const legalDoc = legalDocFromPath()
  if (legalDoc) return <LegalPage doc={legalDoc} />
  return <App />
}

const rootElement = typeof document !== 'undefined' ? document.getElementById('root') : null
if (rootElement) {
  createRoot(rootElement).render(<StrictMode>{pickRoute()}</StrictMode>)
}

// Le service worker n'est enregistré qu'en production : en dev il masquerait le HMR.
if (import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Service worker : enregistrement impossible', err)
    })
  })
}
