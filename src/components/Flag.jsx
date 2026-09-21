// Drapeaux des régions (contrat quadri-langue), en SVG maison plutôt qu'en emoji Unicode :
// les emojis de drapeaux ne s'affichent pas de façon fiable sous Windows/Chrome (police système
// incomplète, replis en code pays "CA"/"FR" en texte) — le SVG rend pareil partout.
// Le Québec en particulier n'a de toute façon aucun emoji standard (pas un pays ISO 3166).

function CanadaFlag({ className }) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden="true">
      <rect width="24" height="16" fill="#fff" />
      <rect width="6" height="16" fill="#d52b1e" />
      <rect x="18" width="6" height="16" fill="#d52b1e" />
      <path
        transform="translate(12 8) scale(0.85)"
        d="M0-5.5 1 -2l3-1-1.3 3L5 1l-3 .5L2 4.5 0 2.5l-2 2L-2 .5 -5 0l2.3-1.5L-4-4l3 1z"
        fill="#d52b1e"
      />
    </svg>
  )
}

function QuebecFlag({ className }) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden="true">
      <rect width="24" height="16" fill="#0f3d7c" />
      <rect x="10.5" y="0" width="3" height="16" fill="#fff" />
      <rect x="0" y="6.5" width="24" height="3" fill="#fff" />
      {[
        [4, 2.5],
        [17.5, 2.5],
        [4, 11],
        [17.5, 11],
      ].map(([x, y], i) => (
        <path
          key={i}
          transform={`translate(${x} ${y}) scale(0.22)`}
          d="M8 0c1 2-1 3-1 3s2 0 2 2c0 1-1 2-1 2h4s-1-1-1-2c0-2 2-2 2-2s-2-1-1-3c-1 1-2 2-3 2s-2-1-3-2z"
          fill="#fff"
        />
      ))}
    </svg>
  )
}

function FranceFlag({ className }) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden="true">
      <rect width="8" height="16" fill="#0055a4" />
      <rect x="8" width="8" height="16" fill="#fff" />
      <rect x="16" width="8" height="16" fill="#ef4135" />
    </svg>
  )
}

function UsFlag({ className }) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden="true">
      <rect width="24" height="16" fill="#fff" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} y={(i * 16) / 7} width="24" height={16 / 13} fill="#b22234" />
      ))}
      <rect width="10" height="8.6" fill="#3c3b6e" />
    </svg>
  )
}

function UkFlag({ className }) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden="true">
      <rect width="24" height="16" fill="#00247d" />
      <path d="M0 0 24 16M24 0 0 16" stroke="#fff" strokeWidth="2.4" />
      <path d="M0 0 24 16M24 0 0 16" stroke="#cf142b" strokeWidth="1" />
      <path d="M12 0V16M0 8H24" stroke="#fff" strokeWidth="4" />
      <path d="M12 0V16M0 8H24" stroke="#cf142b" strokeWidth="2.2" />
    </svg>
  )
}

const FLAGS = { fr: FranceFlag, us: UsFlag, uk: UkFlag }

// `region` : 'qc' affiche Canada + Québec côte à côte (une seule case), les autres leur drapeau simple.
export default function Flag({ region, className = 'h-4 w-5 rounded-sm' }) {
  if (region === 'qc') {
    return (
      <span className="inline-flex items-center gap-1">
        <CanadaFlag className={className} />
        <span aria-hidden="true" className="text-xs text-slate-400">
          /
        </span>
        <QuebecFlag className={className} />
      </span>
    )
  }
  const FlagCmp = FLAGS[region]
  if (!FlagCmp) return null
  return <FlagCmp className={className} />
}
