// Logo RPVD Success — pyramide 4 bandes + wordmark, jamais recoloré (les 4 teintes viennent
// du fichier source ; c'est la palette du site qui s'aligne sur le logo, pas l'inverse).
// variant="full" : pyramide + "RPVD SUCCESS" + baseline (header/nav).
// variant="icon" : pictogramme seul, recadré sur la partie gauche du fichier source (favicon,
//   splash screen) — pas d'asset séparé disponible, donc recadrage CSS via object-position.
// variant="watermark" : pictogramme seul, très faible opacité (empty states, footer).
import logoSrc from '../assets/rpvd-logo.webp'

const ICON_CROP_STYLE = {
  width: '1em',
  height: '1em',
  objectFit: 'cover',
  // Le fichier source est ~1920×1920 avec la pyramide dans le quart supérieur-gauche ;
  // on zoome/recentre dessus plutôt que d'afficher tout le wordmark en miniature.
  objectPosition: '18% 30%',
  transform: 'scale(3.2)',
}

export default function Logo({ variant = 'full', className = '' }) {
  if (variant === 'icon') {
    return (
      <span className={`inline-block overflow-hidden rounded-lg bg-black ${className}`} style={{ fontSize: 'inherit' }}>
        <img src={logoSrc} alt="RPVD Success" style={ICON_CROP_STYLE} />
      </span>
    )
  }

  if (variant === 'watermark') {
    return (
      <img
        src={logoSrc}
        alt=""
        aria-hidden="true"
        className={`pointer-events-none select-none opacity-10 grayscale ${className}`}
      />
    )
  }

  // Assez grand pour ne pas se fondre dans le fond noir pur (le fichier source a lui-même un
  // fond noir autour du pictogramme — à cette taille, le contraste vient de l'orange/blanc/gris
  // de la pyramide elle-même, pas d'un cadre ajouté). `drop-shadow` léger pour le détacher un peu
  // du fond plutôt qu'un halo néon complet (contrat §2 : sobre, pas de glow agressif).
  return (
    <img
      src={logoSrc}
      alt="RPVD Success — Pattern > Theory"
      className={`h-20 w-auto drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] sm:h-28 ${className}`}
    />
  )
}
