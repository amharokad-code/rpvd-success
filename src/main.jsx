// Point d'entrée React : monte l'application et enregistre le service worker en production.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import LegalPage from './pages/LegalPage'
import LegalContactPage from './pages/LegalContactPage'
import './index.css'

// Routage minimal : /legal/<doc> est une page statique indépendante (pas d'auth, pas d'appel
// réseau), le reste (pas de react-router dans ce projet) reste géré par l'état d'onglet d'App.
const LEGAL_DOCS = ['privacy', 'terms', 'cookies', 'refunds']
function legalDocFromPath() {
  if (typeof window === 'undefined') return null
  const match = window.location.pathname.match(/^\/legal\/([a-z]+)/)
  return match && LEGAL_DOCS.includes(match[1]) ? match[1] : null
}
function isLegalContactPath() {
  return typeof window !== 'undefined' && window.location.pathname === '/legal/contact'
}

const rootElement = typeof document !== 'undefined' ? document.getElementById('root') : null
if (rootElement) {
  const legalDoc = legalDocFromPath()
  const isContact = isLegalContactPath()
  createRoot(rootElement).render(
    <StrictMode>
      {isContact ? <LegalContactPage /> : legalDoc ? <LegalPage doc={legalDoc} /> : <App />}
    </StrictMode>,
  )
}

// Le service worker n'est enregistré qu'en production : en dev il masquerait le HMR.
if (import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Service worker : enregistrement impossible', err)
    })
  })
}
