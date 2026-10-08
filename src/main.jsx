// Point d'entrée React : monte le site et retire tout ancien service worker (le site n'est plus une PWA).
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import LegalPage from './pages/LegalPage'
import LegalContactPage from './pages/LegalContactPage'
import BootcampPage from './pages/BootcampPage'
import AccueilPage from './pages/AccueilPage'
import BootcampAdminPage from './pages/BootcampAdminPage'
import BetaPage from './pages/BetaPage'
import ReserverPage from './pages/ReserverPage'
import MerciPage from './pages/MerciPage'
import RembourserPage from './pages/RembourserPage'
import DesabonnerPage from './pages/DesabonnerPage'
import { initAds } from './utils/ads'
import { installErrorTracking } from './utils/track'
import AdminInsightsPage from './pages/AdminInsightsPage'
import './index.css'

// Mesure publicitaire : capture des paramètres de campagne (sessionStorage) et pixels Meta/Snap,
// chargés SEULEMENT si le consentement marketing est donné (voir src/utils/ads.js).
initAds()

// Routage minimal (pas de react-router) :
//   /          page principale Bootcamp (Académie RPVD)
//   /vote      lien court des pubs → Bootcamp, formulaire de vote
//   /reserver  ?s=<session> → Stripe Checkout ; /merci après paiement ; /rembourser ?t=<jeton> ; /desabonner ?v= ou ?b=
//   /accueil   présentation de la méthode (ancienne landing)
//   /admin/bootcamp  décompte des votes + envoi des courriels (jeton requis)
//   /beta      bêta fermée : votes des testeurs (compte is_beta)
//   /app       l'outil d'analyse (connexion par lien magique, puis tableau de bord)
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

// Retour du lien magique Supabase (jetons dans le hash ou ?code=) : doit atterrir sur /app, pas sur la page Bootcamp.
function shouldRedirectRootToApp() {
  if (typeof window === 'undefined') return false
  const { hash, search } = window.location
  const authCallback = /access_token=|refresh_token=|error_description=|type=magiclink/.test(hash) || /[?&]code=/.test(search)
  return authCallback
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
  if (path === '/bootcamp' || path === '/vote') return <BootcampPage />
  if (path === '/reserver') return <ReserverPage />
  if (path === '/merci') return <MerciPage />
  if (path === '/rembourser') return <RembourserPage />
  if (path === '/desabonner') return <DesabonnerPage />
  if (path === '/accueil') return <AccueilPage />
  if (path === '/admin/bootcamp') return <BootcampAdminPage />
  if (path === '/beta') return <BetaPage />
  if (path === '/admin/insights') return <AdminInsightsPage />
  if (isLegalContactPath()) return <LegalContactPage />
  const legalDoc = legalDocFromPath()
  if (legalDoc) return <LegalPage doc={legalDoc} />
  return <App />
}

installErrorTracking()

const rootElement = typeof document !== 'undefined' ? document.getElementById('root') : null
if (rootElement) {
  createRoot(rootElement).render(<StrictMode>{pickRoute()}</StrictMode>)
}

// Le site n'est plus une PWA : on retire le service worker (et ses caches) installé chez d'anciens visiteurs.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => {})
  if (window.caches) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {})
  }
}
