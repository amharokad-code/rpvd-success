// Navigation globale (pivot capsules) : Accueil (démo gratuite, "/"), Capsules (magasin), Mes capsules (connexion
// de l'acheteur) et l'app RPVD (bonus de fidélisation, "/app").
// Pilule flottante en verre, identique sur toutes les pages publiques.
import Logo from './Logo'

const LINKS = [
  { id: 'accueil', href: '/', label: 'Accueil' },
  { id: 'capsules', href: '/capsules', label: 'Capsules' },
  { id: 'mes', href: '/connexion', label: 'Mes capsules' },
  { id: 'app', href: '/app', label: 'App' },
]

export default function SiteNav({ current, className = '' }) {
  return (
    <nav
      aria-label="Navigation principale"
      className={`fixed top-3 z-50 flex items-center gap-1 rounded-full border border-white/10 bg-black/60 p-1 pr-1.5 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.8)] backdrop-blur-xl ${className}`}
    >
      <a href="/" aria-label="RPVD" className="flex h-9 w-9 shrink-0 items-center justify-center">
        <Logo variant="icon" className="h-7 w-7" />
      </a>
      {LINKS.map((l) => {
        const active = l.id === current
        const isApp = l.id === 'app'
        return (
          <a
            key={l.id}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={`focus-ring whitespace-nowrap rounded-full px-2 py-2 text-[13px] font-semibold transition sm:px-4 sm:text-sm ${
              active
                ? 'bg-white/10 text-slate-50'
                : isApp
                  ? 'bg-amber-500 text-ink hover:bg-amber-500'
                  : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {l.label}
          </a>
        )
      })}
    </nav>
  )
}
