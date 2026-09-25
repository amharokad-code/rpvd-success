// Pied de page légal détaillé — variante étoffée de Footer.jsx (qui reste la barre de
// liens minimaliste utilisée sur connexion/paywall/activation). Celui-ci ajoute une ligne
// de divulgation factuelle au-dessus des liens.
//
// Vérifié dans le code avant d'écrire ce texte (netlify/functions/analyze-homework.js,
// en-tête + étape 7) : AUCUNE purge automatique de photo n'est implémentée, et pour cause —
// il n'y a rien à purger : l'image n'est jamais écrite sur disque en premier lieu (traitée en
// mémoire pour l'appel Gemini, puis jetée ; seule l'analyse texte est insérée dans
// `submissions`). Donc pas de mention de "purge automatique après X jours" ici — ce serait une
// promesse plus faible que la réalité (rétention zéro, pas un TTL) autant que le contraire
// serait un mensonge. Le remboursement s'appuie sur REFUND_POLICY (src/legal/content.js),
// seule source de vérité déjà validée pour ce texte — pas de nouvelle politique inventée ici.
import Footer from './Footer'
import { useCopy } from '../context/RegionContext'

const DISCLOSURE_FR =
  "Tes photos d'exercices ne sont jamais enregistrées : elles sont traitées puis jetées, seule l'analyse texte est conservée dans ton compte. Abonnement résiliable à tout moment — voir Remboursement ci-dessous pour les détails."

const DISCLOSURE_EN =
  'Your homework photos are never saved: they are processed then discarded — only the text analysis is kept on your account. Subscription cancellable anytime — see Refunds below for details.'

export default function LegalFooter({ className = '' }) {
  const { region } = useCopy()
  const isEnglish = region === 'us' || region === 'uk'

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <p className="max-w-md text-center text-[11px] leading-relaxed text-slate-500">
        {isEnglish ? DISCLOSURE_EN : DISCLOSURE_FR}
      </p>
      <Footer />
    </div>
  )
}
