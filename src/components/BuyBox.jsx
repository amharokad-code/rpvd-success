// Bloc d'achat : attestation du parent/tuteur (Loi 25, obligatoire) + consentement aux courriels de suivi
// (LCAP, facultatif, NON coché par défaut). Les deux cases sont envoyées au serveur avec la demande de paiement.
import { useState } from 'react'
import { CTA, Spinner } from './bootcamp/BootcampUI'

export default function BuyBox({ label, busy, onBuy }) {
  const [attest, setAttest] = useState(false)
  const [emails, setEmails] = useState(false)
  return (
    <div className="mt-4 space-y-3">
      <label className="flex items-start gap-3 text-sm text-slate-300">
        <input type="checkbox" className="mt-1 h-5 w-5" checked={attest} onChange={(e) => setAttest(e.target.checked)} />
        <span>Je suis le parent ou tuteur de l’élève (ou j’ai 14 ans ou plus) et j’accepte le suivi de son visionnement (segments vus, exercices). <a className="underline" href="/legal/privacy">Confidentialité</a></span>
      </label>
      <label className="flex items-start gap-3 text-sm text-slate-300">
        <input type="checkbox" className="mt-1 h-5 w-5" checked={emails} onChange={(e) => setEmails(e.target.checked)} />
        <span>(Facultatif) Je veux recevoir des courriels sur la progression de mon enfant et des rappels avant l’examen. Je peux me désabonner en tout temps.</span>
      </label>
      <button type="button" disabled={!attest || busy} onClick={() => onBuy({ parent_attest: attest, consent_emails: emails })} className={CTA}>
        {busy ? <Spinner /> : label}
      </button>
    </div>
  )
}
