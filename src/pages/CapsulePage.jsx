// /capsule/:slug : lecteur protégé (privé, noindex). Exige la session d'un acheteur sur un appareil autorisé ;
// un jeton de lecture neuf est demandé à chaque visionnement. La fiche publique est /capsules/:slug.
import { useEffect, useState } from 'react'
import { bootcampCall } from '../lib/bootcampApi'
import { authedHeaders } from './MesCapsulesPage'
import { CARD, Notice, PageShell, Spinner } from '../components/bootcamp/BootcampUI'

export default function CapsulePage() {
  const slug = decodeURIComponent(window.location.pathname.split('/')[2] || '')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    authedHeaders().then((headers) => {
      if (!headers) { window.location.replace('/connexion'); return }
      bootcampCall('my-capsules', { action: 'watch', slug }, headers)
        .then((d) => { setData(d); document.title = `${d.capsule.title} — RPVD` })
        .catch((e) => (e.status === 401 ? window.location.replace('/connexion') : setError(e.message)))
    })
  }, [slug])

  const cap = data && data.capsule
  return (
    <PageShell current="" width="max-w-3xl">
      <p className="pt-6 text-sm"><a className="underline" href="/mes-capsules">← Mes capsules</a></p>
      {error && <div className="pt-4"><Notice tone="error">{error}</Notice></div>}
      {!data && !error && <div className="pt-12"><Spinner /></div>}
      {cap && (
        <>
          <h1 className="pt-4 font-display text-4xl font-bold text-slate-50">{cap.title}</h1>
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
          ) : (
            <div className={`${CARD} mt-6 overflow-hidden`}>
              <video controls controlsList="nodownload" crossOrigin="anonymous" className="aspect-video w-full bg-black" src={data.video_url}>
                <track kind="subtitles" srcLang="fr" label="Français" src={data.subtitles_url} default />
              </video>
            </div>
          )}
          <p className="mt-4 text-sm text-slate-400">Revoir avant l’examen : tu peux la regarder autant de fois que tu veux.</p>
        </>
      )}
    </PageShell>
  )
}
