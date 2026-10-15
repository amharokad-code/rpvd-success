// Récompense du sondage : la démo gratuite (vidéo configurée par VITE_DEMO_VIDEO_URL). Affichée juste après l'envoi
// du sondage et sur /demo (lien reçu par courriel). Facultatif : ajouter la date d'examen pour un rappel utile.
import { useState } from 'react'
import { bootcampCall } from '../lib/bootcampApi'
import { CTA, INPUT, Notice } from './bootcamp/BootcampUI'

const DEMO_VIDEO_URL = import.meta.env.VITE_DEMO_VIDEO_URL || ''

export default function DemoReward({ requestId, topic }) {
  const [date, setDate] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  async function saveDate(e) {
    e.preventDefault()
    setError(null)
    try {
      await bootcampCall('capsule-request', { update_id: requestId, exam_date: date })
      setSaved(true)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-pyramid-orange">C’est fait ✓</p>
        <h3 className="mt-1 font-display text-2xl font-bold text-slate-50">Voici ta démo gratuite</h3>
        {topic && <p className="mt-1 text-slate-300">On a noté ta demande : « {topic} ». On t’écrit dès que la capsule est prête.</p>}
      </div>
      {DEMO_VIDEO_URL ? (
        <video controls preload="metadata" playsInline className="aspect-video w-full rounded-2xl bg-black" src={DEMO_VIDEO_URL} />
      ) : (
        <Notice>La démo arrive très bientôt : tu la recevras par courriel dès qu’elle est prête.</Notice>
      )}
      {requestId && !saved && (
        <form onSubmit={saveDate} className="rounded-2xl border border-white/10 p-4">
          <label className="text-sm font-semibold text-slate-100" htmlFor="exam-date">Quand est l’examen ? (facultatif)</label>
          <div className="mt-2 flex flex-wrap gap-3">
            <input id="exam-date" type="date" className={`${INPUT} max-w-[220px]`} value={date} onChange={(e) => setDate(e.target.value)} />
            <button type="submit" disabled={!date} className={CTA}>Ajouter</button>
          </div>
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        </form>
      )}
      {saved && <Notice tone="ok">Date ajoutée : on te rappellera avant l’examen.</Notice>}
      <a className="inline-block text-sm underline" href="/capsules">Voir les capsules déjà prêtes</a>
    </div>
  )
}
