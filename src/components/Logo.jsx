// Logo RPVD : vraie pyramide 4 bandes (asset d'origine, jamais recoloré) + wordmark « RPVD » en texte,
// pour rester lisible sur le thème clair (le fichier avec wordmark a un fond noir et dit « RPVD SUCCESS »).
// variant="full" : pyramide + « RPVD » + baseline. variant="icon"/"watermark" : pictogramme seul.
import iconSrc from '../assets/rpvd-icon.png'

export default function Logo({ variant = 'full', className = '', tagline = 'Pattern > Theory' }) {
  if (variant === 'icon') {
    return <img src={iconSrc} alt="RPVD" className={`rounded-lg ${className}`} />
  }

  if (variant === 'watermark') {
    return (
      <img
        src={iconSrc}
        alt=""
        aria-hidden="true"
        className={`pointer-events-none select-none opacity-10 grayscale ${className}`}
      />
    )
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img src={iconSrc} alt="" aria-hidden="true" className="h-14 w-14 rounded-xl" />
      <div className="flex flex-col text-left leading-tight">
        <span className="font-display text-3xl font-extrabold tracking-wide text-ink">RPVD</span>
        {tagline && <span className="text-xs font-medium tracking-[0.2em] text-slate-400">{tagline.toUpperCase()}</span>}
      </div>
    </div>
  )
}
