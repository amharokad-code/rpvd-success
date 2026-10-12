// Mini magasin (/capsules) : une carte par capsule publiée (image de couverture, aucun extrait vidéo), Acheter → Stripe Checkout (même caisse et même
// page de visionnage protégée que le reste). Examen mis en avant. Compteur de demandes = vrai chiffre.
import { useEffect, useMemo, useState } from 'react'
import { bootcampCall } from '../lib/bootcampApi'
import { CARD, CTA, LegalLinks, Notice, PageShell, Spinner } from '../components/bootcamp/BootcampUI'

const ALL = 'Tous'

export default function CapsulesStorePage() {
  const [caps, setCaps] = useState(null)
  const [subject, setSubject] = useState(ALL)
  const [level, setLevel] = useState(ALL)
  const [buying, setBuying] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    document.title = 'Capsules RPVD — prêtes maintenant'
    bootcampCall('capsule-public', { action: 'catalog' }).then((d) => setCaps(d.capsules)).catch((e) => { setError(e.message); setCaps([]) })
  }, [])

  const subjects = useMemo(() => [ALL, ...new Set((caps || []).map((c) => c.subject_area))], [caps])
  const levels = useMemo(() => [ALL, ...new Set((caps || []).map((c) => c.level))], [caps])
  const shown = (caps || [])
    .filter((c) => (subject === ALL || c.subject_area === subject) && (level === ALL || c.level === level))
    .sort((a, b) => (b.type === 'exam') - (a.type === 'exam'))

  async function buy(slug) {
    setBuying(slug)
    try {
      const { url } = await bootcampCall('capsule-checkout', { kind: 'capsule', slug })
      window.location.href = url
    } catch (e) {
      setError(e.message)
      setBuying(null)
    }
  }

  const Chips = ({ items, value, onChange }) => (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => (
        <button key={i} type="button" onClick={() => onChange(i)} className={`rounded-full border px-4 py-2 text-sm ${value === i ? 'border-pyramid-orange bg-pyramid-orange/20 text-white' : 'border-white/15 text-slate-300'}`}>{i}</button>
      ))}
    </div>
  )

  return (
    <PageShell current="" width="max-w-5xl">
      <h1 className="pt-6 font-display text-4xl font-bold text-slate-50">Capsules prêtes maintenant</h1>
      <p className="mt-2 text-slate-300">Paiement unique en dollars canadiens, accès par courriel juste après. <a className="underline" href="/legal/refunds">Politique de remboursement</a>.</p>
      {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
      {!caps ? (
        <div className="mt-8"><Spinner /></div>
      ) : (
        <>
          {caps.length > 0 && (
            <div className="mt-6 space-y-3">
              <Chips items={subjects} value={subject} onChange={setSubject} />
              <Chips items={levels} value={level} onChange={setLevel} />
            </div>
          )}
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {shown.map((c) => (
              <div key={c.slug} className={`${CARD} flex flex-col overflow-hidden ${c.type === 'exam' ? 'border-pyramid-orange/70' : ''}`}>
                {c.cover_url ? (
                  <img src={c.cover_url} alt={c.title} loading="lazy" className="aspect-video w-full bg-black object-cover" />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center bg-black p-4 text-center font-display text-2xl font-bold text-slate-50">{c.topic}</div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  {c.type === 'exam' && <span className="mb-1 text-xs font-bold uppercase tracking-widest text-pyramid-orange">Recommandé</span>}
                  <p className="text-xs uppercase tracking-widest text-slate-400">{c.level} · {c.subject_area}{c.duration_min ? ` · ${c.duration_min} min` : ''}</p>
                  <h2 className="mt-1 font-display text-xl font-bold text-slate-50"><a href={`/capsules/${c.slug}`}>{c.title}</a></h2>
                  {c.requests > 0 && <p className="mt-1 text-sm text-slate-400">{c.requests} {c.requests === 1 ? 'parent l’a demandée' : 'parents l’ont demandée'}</p>}
                  <p className="mt-3 text-2xl font-bold text-slate-50">{(c.price_cad / 100).toFixed(0)} $ <span className="text-sm font-normal text-slate-400">CAD</span></p>
                  <button type="button" disabled={buying === c.slug} onClick={() => buy(c.slug)} className={`${CTA} mt-4`}>{buying === c.slug ? <Spinner /> : 'Acheter'}</button>
                </div>
              </div>
            ))}
          </div>
          {caps.length === 0 && <p className="mt-6 text-slate-300">Les premières capsules arrivent bientôt.</p>}
          <p className="mt-8 text-lg">Votre sujet n’y est pas ? <a className="font-semibold underline" href="/#demande">Demandez-le</a>.</p>
        </>
      )}
      <LegalLinks />
    </PageShell>
  )
}
