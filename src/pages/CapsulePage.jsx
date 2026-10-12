// /capsule/:slug : fiche d'achat, ou lecteur vidéo si le jeton d'achat (?t=) est valide. Sous-titres .vtt obligatoires.
import { useEffect, useState } from 'react'
import { bootcampCall, queryParam } from '../lib/bootcampApi'
import { CARD, CTA, LegalLinks, Notice, PageShell, Spinner } from '../components/bootcamp/BootcampUI'

export default function CapsulePage() {
  const slug = decodeURIComponent(window.location.pathname.split('/')[2] || '')
  const token = queryParam('t')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    const call = token ? bootcampCall('capsule-public', { action: 'access', slug, token }) : bootcampCall('capsule-public', { action: 'capsule', slug })
    call.then((d) => { setData(d); document.title = `${d.capsule.title} — RPVD` }).catch((e) => setError(e.message))
  }, [slug, token])

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

  const cap = data && data.capsule
  return (
    <PageShell current="" width="max-w-3xl">
      {error && <div className="pt-8"><Notice tone="error">{error}</Notice></div>}
      {!data && !error && <div className="pt-12"><Spinner /></div>}
      {cap && (
        <>
          <h1 className="pt-8 font-display text-4xl font-bold text-slate-50">{cap.title}</h1>
          <p className="mt-2 text-slate-400">{cap.level} · {cap.subject_area}{cap.duration_min ? ` · ${cap.duration_min} min` : ''}</p>
          {data.vdo ? (
            <div className={`${CARD} mt-6 overflow-hidden`}>
              <iframe
                title={cap.title}
                className="aspect-video w-full bg-black"
                src={`https://player.vdocipher.com/v2/?otp=${encodeURIComponent(data.vdo.otp)}&playbackInfo=${encodeURIComponent(data.vdo.playbackInfo)}`}
                allow="encrypted-media; fullscreen"
                allowFullScreen
              />
            </div>
          ) : data.video_url ? (
            <div className={`${CARD} mt-6 overflow-hidden`}>
              <video controls controlsList="nodownload" crossOrigin="anonymous" className="aspect-video w-full bg-black" src={data.video_url}>
                <track kind="subtitles" srcLang="fr" label="Français" src={data.subtitles_url} default />
              </video>
            </div>
          ) : (
            <div className={`${CARD} mt-6 p-6`}>
              <p className="text-3xl font-bold text-slate-50">{(cap.price_cad / 100).toFixed(0)} $ <span className="text-sm font-normal text-slate-400">CAD, paiement unique</span></p>
              <button type="button" onClick={buy} disabled={busy} className={`${CTA} mt-4`}>{busy ? <Spinner /> : 'Acheter la capsule'}</button>
              <p className="mt-3 text-sm text-slate-400">Voir la <a className="underline" href="/legal/refunds">politique de remboursement</a>.</p>
            </div>
          )}
        </>
      )}
      <LegalLinks />
    </PageShell>
  )
}
