// Logo Gradus : escalier ambre (le « gradus », le pas) + wordmark. Sources : campagne/04-creatifs/_outil/brand
// (node campagne/04-creatifs/_outil/brand/make.mjs régénère les PNG et les icônes du site).
// variant="full" : escalier + « Gradus » (header/nav). variant="icon"/"watermark" : pictogramme seul.
import logoSrc from '../assets/gradus-logo.png'
import iconSrc from '../assets/gradus-icon.png'

export default function Logo({ variant = 'full', className = '' }) {
  if (variant === 'icon') {
    return <img src={iconSrc} alt="Gradus" className={`rounded-lg ${className}`} />
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
      <img src={logoSrc} alt="Gradus — Pattern > Theory" className="h-full w-full object-cover object-center" />
    </div>
  )
}
