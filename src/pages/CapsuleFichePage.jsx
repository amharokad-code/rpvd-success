// /capsules/:slug : fiche publique (titre, niveau, matière, description, prix). Jamais la vidéo ni la démarche.
// Le même contenu est pré-rendu côté serveur pour les robots (netlify/functions/seo.js).
import { useEffect, useState } from 'react'
import { bootcampCall } from '../lib/bootcampApi'
import { CARD, CTA, LegalLinks, Notice, PageShell, Spinner } from '../components/bootcamp/BootcampUI'

export default function CapsuleFichePage() {
  const slug = decodeURIComponent(window.location.pathname.split('/')[2] || '')
  const [cap, setCap] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    bootcampCall('capsule-public', { action: 'capsule', slug })
      .then((d) => { setCap(d.capsule); document.title = `${d.capsule.title} — Capsule RPVD` })
      .catch((e) => setError(e.message))
  }, [slug])

  async function buy() {
    setBusy(true)
    try {
      const { url } = await bootcampCall('capsule-checkout', { kind: 'capsule', slug })
      window.location.href = url
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <PageShell current="" width="max-w-3xl">
      <p className="pt-6 text-sm"><a className="underline" href="/capsules">← Capsules</a></p>
      {error && <div className="pt-4"><Notice tone="error">{error}</Notice></div>}
      {!cap && !error && <div className="pt-12"><Spinner /></div>}
      {cap && (
        <>
          {cap.cover_url && <img src={cap.cover_url} alt={cap.title} className="mt-4 aspect-video w-full rounded-3xl object-cover" />}
          <h1 className="pt-4 font-display text-4xl font-bold text-slate-50">{cap.title}</h1>
          <p className="mt-2 text-slate-400">{cap.level} · {cap.subject_area}{cap.duration_min ? ` · ${cap.duration_min} min` : ''}</p>
          {cap.description && <p className="mt-4 text-lg text-slate-300">{cap.description}</p>}
          <div className={`${CARD} mt-6 p-6`}>
            <p className="text-lg font-semibold text-slate-50">Regarde-la autant de fois que tu veux, à vie.</p>
            <p className="mt-2 text-3xl font-bold text-slate-50">{(cap.price_cad / 100).toFixed(0)} $ <span className="text-sm font-normal text-slate-400">CAD, paiement unique</span></p>
            <button type="button" onClick={buy} disabled={busy} className={`${CTA} mt-4`}>{busy ? <Spinner /> : 'Acheter la capsule'}</button>
            <p className="mt-3 text-sm text-slate-400">Voir la <a className="underline" href="/legal/refunds">politique de remboursement</a>. Déjà acheté ? <a className="underline" href="/connexion">Mes capsules</a></p>
          </div>
        </>
      )}
      <LegalLinks />
    </PageShell>
  )
}
