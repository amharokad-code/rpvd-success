// /admin (et /admin/capsules) : mini admin. Connexion par lien magique ; le serveur n'accepte que les courriels de ADMIN_EMAILS.
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { bootcampCall } from '../lib/bootcampApi'
import { CARD, CTA, INPUT, Notice, Spinner } from '../components/bootcamp/BootcampUI'

const EMPTY_CAP = { cover_url: '', slug: '', title: '', type: 'exam', subject_area: '', topic: '', level: '', duration_min: '' }
const EMPTY_BC = { title: '', topic: '', starts_at: '', capacity: 20, meeting_url: '', chat_url: '' }

export default function CapsuleAdminPage() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState('')
  const [data, setData] = useState(null)
  const [msg, setMsg] = useState(null)
  const [cap, setCap] = useState(EMPTY_CAP)
  const [files, setFiles] = useState({ video: null, vtt: null })
  const [bc, setBc] = useState(EMPTY_BC)

  useEffect(() => {
    document.title = 'Admin — RPVD'
    supabase.auth.getSession().then(({ data: d }) => { setSession(d.session); setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const auth = () => ({ Authorization: `Bearer ${session.access_token}` })
  const call = (body) => bootcampCall('capsule-admin', body, auth())
  const load = () => call({ action: 'overview' }).then(setData).catch((e) => setMsg({ tone: 'error', text: e.message }))
  useEffect(() => { if (session) load() }, [session]) // eslint-disable-line react-hooks/exhaustive-deps

  async function login(e) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/admin` } })
    setMsg(error ? { tone: 'error', text: error.message } : { tone: 'ok', text: 'Lien envoyé. Ouvre-le sur cet appareil.' })
  }

  async function upload(kind) {
    const file = files[kind]
    const { path, token } = await call({ action: 'upload_url', slug: cap.slug, file: kind })
    const { error } = await supabase.storage.from('capsules').uploadToSignedUrl(path, token, file)
    if (error) throw error
    return path
  }

  async function saveCapsule(publish) {
    setMsg(null)
    try {
      const body = { action: 'save_capsule', ...cap, duration_min: cap.duration_min ? Number(cap.duration_min) : null, publish }
      if (files.cover) {
        const ext = files.cover.type === 'image/png' ? 'png' : 'jpg'
        const up = await call({ action: 'upload_url', slug: cap.slug, file: 'cover', ext })
        const { error } = await supabase.storage.from('capsule-covers').uploadToSignedUrl(up.path, up.token, files.cover)
        if (error) throw error
        body.cover_url = up.public_url
      } else {
        body.cover_url = cap.cover_url || ''
      }
      if (cap.vdo) {
        body.video_url = `vdo:${cap.vdo}`
        body.subtitles_url = cap.vdo_captions ? 'vdocipher:captions' : ''
      } else if (files.video) body.video_url = await upload('video')
      if (files.vtt) body.subtitles_url = await upload('vtt')
      if (!cap.vdo && (!files.video || !files.vtt)) {
        const existing = data.capsules.find((c) => c.slug === cap.slug)
        body.video_url = body.video_url || (existing && existing.video_url) || ''
        body.subtitles_url = body.subtitles_url || (existing && existing.subtitles_url) || ''
      }
      await call(body)
      setMsg({ tone: 'ok', text: publish ? 'Capsule publiée.' : 'Capsule enregistrée.' })
      load()
    } catch (e) {
      setMsg({ tone: 'error', text: e.message })
    }
  }

  async function createBootcamp(e) {
    e.preventDefault()
    try {
      await call({ action: 'create_bootcamp', ...bc, capacity: Number(bc.capacity), starts_at: new Date(bc.starts_at).toISOString() })
      setBc(EMPTY_BC)
      setMsg({ tone: 'ok', text: 'Bootcamp créé.' })
      load()
    } catch (err) {
      setMsg({ tone: 'error', text: err.message })
    }
  }

  if (!ready) return <div className="p-8"><Spinner /></div>
  const bind = (obj, setObj, k) => ({ value: obj[k], onChange: (e) => setObj((o) => ({ ...o, [k]: e.target.value })) })

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 text-slate-200">
      <h1 className="font-display text-3xl font-bold text-slate-50">Admin RPVD</h1>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {!session ? (
        <form onSubmit={login} className={`${CARD} flex max-w-md flex-col gap-3 p-5`}>
          <input className={INPUT} type="email" required placeholder="Courriel admin" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className={CTA}>Recevoir un lien de connexion</button>
        </form>
      ) : !data ? (
        <Spinner />
      ) : (
        <>
          <section className={`${CARD} p-5`}>
            <h2 className="font-display text-xl font-bold">Demandes par sujet ({data.total_requests} au total)</h2>
            <table className="mt-3 w-full text-left text-sm">
              <thead><tr className="text-slate-400"><th>Sujet</th><th>Niveau</th><th>Demandes</th><th /></tr></thead>
              <tbody>
                {data.demand.map((d) => (
                  <tr key={d.topic_key} className="border-t border-white/10">
                    <td className="py-2">{d.topic}</td><td>{d.level}</td><td>{d.requests}</td>
                    <td>{d.ready_to_produce ? <strong className="text-pyramid-orange">À produire (≥ 3)</strong> : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className={`${CARD} grid gap-3 p-5 sm:grid-cols-2`}>
            <h2 className="font-display text-xl font-bold sm:col-span-2">Capsule : créer / publier</h2>
            <input className={INPUT} placeholder="slug (ex. exam-sn4-trigo)" {...bind(cap, setCap, 'slug')} />
            <input className={INPUT} placeholder="Titre" {...bind(cap, setCap, 'title')} />
            <select className={INPUT} {...bind(cap, setCap, 'type')}><option value="exam">Examen (29 $)</option><option value="concept">Concept (24 $)</option></select>
            <input className={INPUT} placeholder="Matière" {...bind(cap, setCap, 'subject_area')} />
            <input className={INPUT} placeholder="Sujet (même libellé que les demandes)" {...bind(cap, setCap, 'topic')} />
            <input className={INPUT} placeholder="Niveau" {...bind(cap, setCap, 'level')} />
            <input className={INPUT} type="number" placeholder="Durée (min)" {...bind(cap, setCap, 'duration_min')} />
            <label className="text-sm sm:col-span-2">Image de couverture (.jpg / .png){cap.cover_url ? ' — actuelle conservée si vide' : ''}<input type="file" accept="image/jpeg,image/png" className="mt-1 block" onChange={(e) => setFiles((f) => ({ ...f, cover: e.target.files[0] }))} /></label>
            <input className={INPUT} placeholder="ID VdoCipher (recommandé, DRM + filigrane)" value={cap.vdo || ''} onChange={(e) => setCap((o) => ({ ...o, vdo: e.target.value.trim() }))} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(cap.vdo_captions)} onChange={(e) => setCap((o) => ({ ...o, vdo_captions: e.target.checked }))} />Sous-titres ajoutés dans VdoCipher</label>
            <label className="text-sm">Vidéo (.mp4)<input type="file" accept="video/mp4" className="mt-1 block" onChange={(e) => setFiles((f) => ({ ...f, video: e.target.files[0] }))} /></label>
            <label className="text-sm">Sous-titres (.vtt)<input type="file" accept=".vtt,text/vtt" className="mt-1 block" onChange={(e) => setFiles((f) => ({ ...f, vtt: e.target.files[0] }))} /></label>
            <div className="flex gap-3 sm:col-span-2">
              <button type="button" className={CTA} onClick={() => saveCapsule(undefined)}>Enregistrer</button>
              <button type="button" className={CTA} onClick={() => saveCapsule(true)}>Publier</button>
              <button type="button" className="underline" onClick={() => saveCapsule(false)}>Dépublier</button>
            </div>
            <ul className="text-sm text-slate-300 sm:col-span-2">
              {data.capsules.map((c) => (
                <li key={c.id}>
                  <button type="button" className="underline" onClick={() => setCap({ ...EMPTY_CAP, ...c, duration_min: '' })}>{c.slug}</button> — {c.title} — {c.published ? 'publiée' : 'brouillon'}
                </li>
              ))}
            </ul>
          </section>

          <section className={`${CARD} p-5`}>
            <h2 className="font-display text-xl font-bold">Commandes ({data.orders.length})</h2>
            <table className="mt-3 w-full text-left text-sm">
              <thead><tr className="text-slate-400"><th>Date</th><th>Courriel</th><th>Produit</th><th>Montant</th></tr></thead>
              <tbody>
                {data.orders.map((o) => (
                  <tr key={o.id} className="border-t border-white/10">
                    <td className="py-2">{new Date(o.created_at).toLocaleDateString('fr-CA')}</td><td>{o.email}</td><td>{o.product_type}</td><td>{(o.amount / 100).toFixed(2)} $ {o.currency.toUpperCase()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <form onSubmit={createBootcamp} className={`${CARD} grid gap-3 p-5 sm:grid-cols-2`}>
            <h2 className="font-display text-xl font-bold sm:col-span-2">Créer un bootcamp (99 $)</h2>
            <input className={INPUT} required placeholder="Titre" {...bind(bc, setBc, 'title')} />
            <input className={INPUT} required placeholder="Sujet" {...bind(bc, setBc, 'topic')} />
            <input className={INPUT} required type="datetime-local" {...bind(bc, setBc, 'starts_at')} />
            <input className={INPUT} required type="number" min="1" placeholder="Capacité" {...bind(bc, setBc, 'capacity')} />
            <input className={INPUT} required placeholder="Lien de la séance (Meet / Zoom)" {...bind(bc, setBc, 'meeting_url')} />
            <input className={INPUT} placeholder="Lien du clavardage (WhatsApp / Discord)" {...bind(bc, setBc, 'chat_url')} />
            <button className={`${CTA} sm:col-span-2`}>Créer</button>
            <ul className="text-sm text-slate-300 sm:col-span-2">
              {data.bootcamps.map((b) => <li key={b.id}>{b.title} — {new Date(b.starts_at).toLocaleString('fr-CA')} — {b.capacity} places</li>)}
            </ul>
          </form>
        </>
      )}
    </div>
  )
}
