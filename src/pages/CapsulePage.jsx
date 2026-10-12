// /capsule/:slug : parcours de l'élève (privé, noindex) : segments, « Commence ici », exercice + correction RPVD,
// compte à rebours vers la vraie date d'examen et plan suggéré. Un jeton de lecture neuf à chaque visionnement ;
// la progression (90 % vu = complété) est envoyée au serveur. Aucun suivi publicitaire sur cette page.
import { useCallback, useEffect, useRef, useState } from 'react'
import { bootcampCall } from '../lib/bootcampApi'
import { examCountdown, planLabel } from '../lib/examPlan'
import { authedHeaders } from './MesCapsulesPage'
import { CARD, CTA, Notice, PageShell, Spinner } from '../components/bootcamp/BootcampUI'

const VDO_API = 'https://player.vdocipher.com/v2/api.js'

function loadVdoApi() {
  if (window.VdoPlayer) return Promise.resolve()
  return new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = VDO_API
    s.onload = resolve
    s.onerror = resolve
    document.head.appendChild(s)
  })
}

export default function CapsulePage() {
  const slug = decodeURIComponent(window.location.pathname.split('/')[2] || '')
  const [course, setCourse] = useState(null)
  const [error, setError] = useState(null)
  const [current, setCurrent] = useState(null) // { segment, vdo | video_url, subtitles_url }
  const [correction, setCorrection] = useState({})
  const iframeRef = useRef(null)
  const lastSent = useRef(0)

  const call = useCallback(async (body) => {
    const headers = await authedHeaders()
    if (!headers) { window.location.replace('/connexion'); throw new Error('Connexion requise.') }
    return bootcampCall('my-capsules', { slug, ...body }, headers)
  }, [slug])

  const refresh = useCallback(() => call({ action: 'course' }).then((d) => { setCourse(d); document.title = `${d.capsule.title} — RPVD` }), [call])

  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    refresh().catch((e) => { if (e.status !== 401) setError(e.message) })
  }, [refresh])

  async function open(segment) {
    setError(null)
    try {
      const d = await call({ action: 'watch', segment_id: segment ? segment.id : undefined })
      setCurrent({ segment, ...d })
    } catch (e) {
      setError(e.message)
    }
  }

  const report = useCallback((seconds) => {
    if (!current || !current.segment) return
    if (Math.abs(seconds - lastSent.current) < 10) return
    lastSent.current = seconds
    call({ action: 'progress', segment_id: current.segment.id, seconds: Math.floor(seconds) }).then((r) => { if (r.complete) refresh() }).catch(() => {})
  }, [call, current, refresh])

  // Progression via l'API du lecteur VdoCipher (lecture de currentTime toutes les 10 s) ou l'élément <video>.
  useEffect(() => {
    if (!current || !current.vdo || !iframeRef.current) return undefined
    let timer
    loadVdoApi().then(() => {
      if (!window.VdoPlayer) return
      const player = window.VdoPlayer.getInstance(iframeRef.current)
      timer = setInterval(() => {
        try { report(player.video.currentTime || 0) } catch { /* lecteur pas prêt */ }
      }, 10000)
    })
    return () => clearInterval(timer)
  }, [current, report])

  async function tried(segment) {
    try {
      const r = await call({ action: 'attempt', segment_id: segment.id })
      setCorrection((c) => ({ ...c, [segment.id]: r.correction }))
      refresh()
    } catch (e) {
      setError(e.message)
    }
  }

  const countdown = course && examCountdown(course.days_to_exam)
  const next = course && course.segments.find((s) => !s.complete)

  return (
    <PageShell current="" width="max-w-3xl">
      <p className="pt-6 text-sm"><a className="underline" href="/mes-capsules">← Mes capsules</a></p>
      {error && <div className="pt-4"><Notice tone="error">{error}</Notice></div>}
      {!course && !error && <div className="pt-12"><Spinner /></div>}
      {course && (
        <>
          <h1 className="pt-4 font-display text-4xl font-bold text-slate-50">{course.capsule.title}</h1>
          <p className="mt-2 text-slate-400">{course.capsule.level} · {course.capsule.subject_area}</p>
          {countdown && <p className="mt-3 text-lg font-semibold text-pyramid-orange">{countdown}</p>}

          {course.summary.total > 0 && (
            <div className="mt-4">
              <div className="h-3 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={course.summary.total} aria-valuenow={course.summary.completed}>
                <div className="h-full rounded-full bg-pyramid-orange" style={{ width: `${(course.summary.completed / course.summary.total) * 100}%` }} />
              </div>
              <p className="mt-1 text-sm text-slate-400">{course.summary.completed} segment{course.summary.completed > 1 ? 's' : ''} sur {course.summary.total} terminé{course.summary.completed > 1 ? 's' : ''}</p>
            </div>
          )}

          {course.plan.length > 0 && (
            <div className={`${CARD} mt-5 p-4`}>
              <p className="font-semibold text-slate-50">Plan suggéré</p>
              <ul className="mt-2 text-slate-300">{course.plan.map((p) => <li key={p.day}>{planLabel(p.day, p.ordres)}</li>)}</ul>
            </div>
          )}

          {course.legacy ? (
            <button type="button" className={`${CTA} mt-6`} onClick={() => open(null)}>Regarder</button>
          ) : (
            <ol className="mt-6 space-y-3">
              {course.segments.map((s) => (
                <li key={s.id} className={`${CARD} p-4 ${s.ordre === 1 && !s.complete ? 'border-pyramid-orange/70' : ''}`}>
                  {s.ordre === 1 && <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-pyramid-orange">Commence ici</span>}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-50">{s.ordre}. {s.titre}</p>
                      <p className="text-sm text-slate-400">{Math.round(s.duree_sec / 60)} min{s.complete ? ' · terminé ✓' : ''}{s.exercice_tente ? ' · exercice tenté ✓' : ''}</p>
                    </div>
                    <button type="button" className={CTA} onClick={() => open(s)}>{next && next.id === s.id && !s.complete ? 'Continuer' : 'Regarder'}</button>
                  </div>
                  {current && current.segment && current.segment.id === s.id && (
                    <div className="mt-4">
                      {current.vdo ? (
                        <iframe
                          ref={iframeRef}
                          title={s.titre}
                          className="aspect-video w-full rounded-2xl bg-black"
                          src={`https://player.vdocipher.com/v2/?otp=${encodeURIComponent(current.vdo.otp)}&playbackInfo=${encodeURIComponent(current.vdo.playbackInfo)}`}
                          allow="encrypted-media; fullscreen"
                          allowFullScreen
                        />
                      ) : (
                        <video controls controlsList="nodownload" crossOrigin="anonymous" className="aspect-video w-full rounded-2xl bg-black" src={current.video_url} onTimeUpdate={(e) => report(e.currentTarget.currentTime)}>
                          <track kind="subtitles" srcLang="fr" label="Français" src={current.subtitles_url} default />
                        </video>
                      )}
                      {s.exercice_enonce && (
                        <div className="mt-4 rounded-2xl border border-white/10 p-4">
                          <p className="font-semibold text-slate-50">Mini-exercice</p>
                          <p className="mt-2 whitespace-pre-wrap text-slate-300">{s.exercice_enonce}</p>
                          {correction[s.id] === undefined && !s.exercice_tente ? (
                            <button type="button" className={`${CTA} mt-3`} onClick={() => tried(s)}>J’ai essayé</button>
                          ) : (
                            <button type="button" className="mt-3 text-sm underline" onClick={() => (correction[s.id] === undefined ? tried(s) : null)}>
                              {correction[s.id] === undefined ? 'Afficher la correction' : ''}
                            </button>
                          )}
                          {correction[s.id] !== undefined && (
                            <div className="mt-3 rounded-xl bg-white/[0.05] p-3">
                              <p className="text-sm font-semibold text-pyramid-orange">Correction RPVD</p>
                              <p className="mt-1 whitespace-pre-wrap text-slate-200">{correction[s.id] || 'Correction à venir.'}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
          {current && course.legacy && (
            <div className={`${CARD} mt-4 overflow-hidden`}>
              {current.vdo ? (
                <iframe title={course.capsule.title} className="aspect-video w-full bg-black" src={`https://player.vdocipher.com/v2/?otp=${encodeURIComponent(current.vdo.otp)}&playbackInfo=${encodeURIComponent(current.vdo.playbackInfo)}`} allow="encrypted-media; fullscreen" allowFullScreen />
              ) : (
                <video controls controlsList="nodownload" crossOrigin="anonymous" className="aspect-video w-full bg-black" src={current.video_url}>
                  <track kind="subtitles" srcLang="fr" label="Français" src={current.subtitles_url} default />
                </video>
              )}
            </div>
          )}
          <p className="mt-6 text-sm text-slate-400">Tu peux revoir chaque segment autant de fois que tu veux, avant l’examen aussi.</p>
        </>
      )}
    </PageShell>
  )
}
