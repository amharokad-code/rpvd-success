// Liens légaux minimalistes — visibles sur la connexion, le paywall et l'activation (contrat conformité §0).
import { useCopy } from '../context/RegionContext'

const LINKS_FR = [
  { href: '/legal/privacy', label: 'Confidentialité' },
  { href: '/legal/terms', label: "Conditions d'utilisation" },
  { href: '/legal/cookies', label: 'Cookies' },
  { href: '/legal/refunds', label: 'Remboursement' },
]

const LINKS_EN = [
  { href: '/legal/privacy', label: 'Privacy' },
  { href: '/legal/terms', label: 'Terms of Service' },
  { href: '/legal/cookies', label: 'Cookies' },
  { href: '/legal/refunds', label: 'Refunds' },
]

export default function Footer({ className = '' }) {
  const { region } = useCopy()
  const links = region === 'us' || region === 'uk' ? LINKS_EN : LINKS_FR
  return (
    <footer className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-500 ${className}`}>
      {links.map((link) => (
        <a key={link.href} href={link.href} className="hover:text-slate-300 hover:underline">
          {link.label}
        </a>
      ))}
    </footer>
  )
}
