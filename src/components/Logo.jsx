// Logo Gradus : escalier ambre (le « gradus », le pas) + wordmark. Sources : campagne/04-creatifs/_outil/brand
// (node campagne/04-creatifs/_outil/brand/make.mjs régénère les PNG et les icônes du site).
// variant="full" : escalier + « Gradus » (header/nav). variant="icon"/"watermark" : pictogramme seul.
import logoSrc from '../assets/gradus-logo.png'
import iconSrc from '../assets/gradus-icon.png'

export default function Logo({ variant = 'full', className = '', tagline = 'la marche à suivre' }) {
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

  // Version complète : escalier + « Gradus », et en dessous la signature (texte normal, pas gras,
  // traduisible : elle vient de la copie de la région).
  return (
    <div className={`flex flex-col gap-1 ${className || 'items-start'}`}>
      <img src={logoSrc} alt="Gradus" className="h-14 w-auto" />
      {tagline && <span className="pl-1 text-sm font-normal tracking-wide text-slate-400">{tagline}</span>}
    </div>
  )
}
