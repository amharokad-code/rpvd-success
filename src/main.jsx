// Point d'entrée React : monte le site et retire tout ancien service worker (le site n'est plus une PWA).
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import LegalPage from './pages/LegalPage'
import LegalContactPage from './pages/LegalContactPage'
import BetaPage from './pages/BetaPage'
import BetaAdminPage from './pages/BetaAdminPage'
import RembourserPage from './pages/RembourserPage'
import DesabonnerPage from './pages/DesabonnerPage'
import ParentLandingPage from './pages/ParentLandingPage'
import CapsulePage from './pages/CapsulePage'
import CapsulesStorePage from './pages/CapsulesStorePage'
import CapsuleFichePage from './pages/CapsuleFichePage'
import MesCapsulesPage from './pages/MesCapsulesPage'
import ConnexionPage from './pages/ConnexionPage'
import DemoPage from './pages/DemoPage'
import SuiviPage from './pages/SuiviPage'
import CapsuleAdminPage from './pages/CapsuleAdminPage'
import { initAds } from './utils/ads'
import { installErrorTracking } from './utils/track'
import AdminInsightsPage from './pages/AdminInsightsPage'
import EmaSeancesPage from './pages/EmaSeancesPage'
import './index.css'

// Mesure publicitaire : capture des paramètres de campagne (sessionStorage) et pixels Meta/Snap,
// chargés SEULEMENT si le consentement marketing est donné (voir src/utils/ads.js).
initAds()

// Routage minimal (pas de react-router) :
//   /          landing parents : capsules vidéo RPVD (pivot 2026-10-12) ; /capsule/:slug ; /admin
//   /capsules, /capsules/:slug, /connexion, /mes-capsules, /capsule/:slug, /suivi, /demo, /admin
//   /rembourser ?t=<jeton> (billets de l'ancien Bootcamp) ; /desabonner ?v= ?b= ?c= ?o=
//   (anciennes pages /bootcamp /vote /reserver /merci /accueil /admin/bootcamp : redirigées vers /)
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

function MerciCapsule() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center text-slate-200">
      <h1 className="font-display text-3xl font-bold text-slate-50">Merci, ton paiement est confirmé</h1>
      <p className="mt-4">Ton accès arrive par courriel dans quelques instants (pense à vérifier les indésirables).</p>
      <a className="mt-6 inline-block underline" href="/">Retour à l’accueil</a>
    </div>
  )
}

// ematutorat.com (même site, autre marque) : séances en direct E.M.A. ; `/seances` permet de les voir
// aussi sur le site principal (aperçu avant la bascule du domaine).
function isEmaHost() {
  return /(^|\.)ematutorat\.com$/i.test(window.location.hostname)
}

function pickRoute() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/seances' || (path === '/' && isEmaHost() && !shouldRedirectRootToApp())) return <EmaSeancesPage />
  if (path === '/') {
    if (shouldRedirectRootToApp()) {
      window.location.replace(`/app${window.location.search}${window.location.hash}`)
      return null
    }
    return <ParentLandingPage />
  }
  if (path === '/capsules') return <CapsulesStorePage />
  if (path.startsWith('/capsules/')) return <CapsuleFichePage />
  if (path === '/demande') return <ParentLandingPage />
  if (path === '/mes-capsules') return <MesCapsulesPage />
  if (path === '/connexion') return <ConnexionPage />
  if (path === '/suivi') return <SuiviPage />
  if (path === '/demo') return <DemoPage />
  if (path.startsWith('/capsule/')) return <CapsulePage />
  if (path === '/merci-capsule') return <MerciCapsule />
  if (path === '/admin' || path === '/admin/capsules') return <CapsuleAdminPage />
  if (path === '/rembourser') return <RembourserPage />
  if (path === '/desabonner') return <DesabonnerPage />
  // Anciennes pages du Bootcamp hebdomadaire (retirées au pivot capsules) : les vieux liens mènent à l'accueil.
  if (['/accueil', '/bootcamp', '/vote', '/reserver', '/merci', '/admin/bootcamp'].includes(path)) {
    window.location.replace('/')
    return null
  }
  if (path === '/beta') return <BetaPage />
  if (path === '/admin/beta') return <BetaAdminPage />
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
