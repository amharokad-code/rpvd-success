// Bouton « squishy » (contrat §3) : cible ≥ 44 px, coins rounded-2xl, focus visible.
// Variantes : primary (amber = action), success (emerald), secondary, ghost, coral (micro-feedback).

// Dégradés (plutôt que des aplats) + liseré « glossy » (shadow-glow-*, voir tailwind.config.js)
// pour un rendu un peu plus premium/moderne, sans s'éloigner de la palette du contrat.
const VARIANTS = {
  primary: 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-900 shadow-glow-amber hover:from-amber-300 hover:to-amber-400',
  success: 'bg-gradient-to-b from-emerald-400 to-emerald-500 text-slate-900 shadow-glow-emerald hover:from-emerald-300 hover:to-emerald-400',
  secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-white/5',
  ghost: 'bg-transparent text-slate-300 hover:text-slate-100 hover:bg-white/5',
  coral: 'bg-gradient-to-b from-coral to-coral-soft text-slate-900 shadow-glow-coral hover:brightness-105',
}

const SIZES = {
  md: 'min-h-[44px] px-5 py-2.5 text-base',
  lg: 'min-h-[56px] px-7 py-3.5 text-lg',
}

// Petit anneau qui tourne pendant `loading` (décoratif, masqué aux lecteurs d'écran).
function Spinner() {
  return (
    <svg
      className="h-5 w-5 shrink-0 motion-safe:animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  children,
  type = 'button',
  disabled,
  ...props
}) {
  const isDisabled = Boolean(disabled) || loading
  const variantClasses = VARIANTS[variant] ?? VARIANTS.primary
  const sizeClasses = SIZES[size] ?? SIZES.md

  // Désactivé : opacité réduite, curseur interdit et AUCUN effet de scale.
  const stateClasses = isDisabled ? 'opacity-60 cursor-not-allowed' : 'squishy cursor-pointer'

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-semibold leading-tight select-none focus-ring ${variantClasses} ${sizeClasses} ${stateClasses} ${className}`}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}
