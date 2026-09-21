// Logo RPVD Success — pyramide 4 bandes + wordmark, jamais recoloré (les 4 teintes viennent
// du fichier source ; c'est la palette du site qui s'aligne sur le logo, pas l'inverse).
// variant="full" : pyramide + "RPVD SUCCESS" + baseline (header/nav) — fichier avec wordmark.
// variant="icon"/"watermark" : pictogramme isolé (asset dédié, fourni séparément — plus de
//   recadrage CSS approximatif sur le fichier avec wordmark).
import logoSrc from '../assets/rpvd-logo.webp'
import iconSrc from '../assets/rpvd-icon.png'

export default function Logo({ variant = 'full', className = '' }) {
  if (variant === 'icon') {
    return <img src={iconSrc} alt="RPVD Success" className={`rounded-lg ${className}`} />
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

  // Pleine largeur du conteneur (contrat) : le fichier source a beaucoup de marge noire vide
  // au-dessus/en dessous du pictogramme+wordmark (canvas quasi carré), donc l'étirer en `w-full
  // h-auto` donnerait une bannière démesurément haute. On recadre plutôt (object-cover) dans un
  // cadre large qui garde la largeur pleine sans laisser le vide dicter la hauteur.
  return (
    <div className={`aspect-[16/5] w-full overflow-hidden drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] ${className}`}>
      <img src={logoSrc} alt="RPVD Success — Pattern > Theory" className="h-full w-full object-cover object-center" />
    </div>
  )
}
