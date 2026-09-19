// Point d'entrée React : monte l'application et enregistre le service worker en production.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const rootElement = typeof document !== 'undefined' ? document.getElementById('root') : null
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
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
