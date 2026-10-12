// /mes-capsules : bibliothèque de l'acheteur. Visionnement illimité, à vie, sur ses appareils autorisés.
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { bootcampCall } from '../lib/bootcampApi'
import { getDeviceFingerprint } from '../utils/security-fingerprint'
import { CARD, CTA, Notice, PageShell, Spinner } from '../components/bootcamp/BootcampUI'

export async function authedHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data && data.session && data.session.access_token
  if (!token) return null
  return { Authorization: `Bearer ${token}`, 'x-device-fingerprint': await getDeviceFingerprint() }
}

export default function MesCapsulesPage() {
  const [list, setList] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    document.title = 'Mes capsules — RPVD'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    // detectSessionInUrl (client Supabase) consomme le lien magique avant ce premier appel.
    supabase.auth.getSession().then(async () => {
      const headers = await authedHeaders()
      if (!headers) { window.location.replace('/connexion'); return }
      bootcampCall('my-capsules', { action: 'list' }, headers).then((d) => setList(d.capsules)).catch((e) => {
        if (e.status === 401) window.location.replace('/connexion')
        else { setError(e.message); setList([]) }
      })
    })
  }, [])

  return (
    <PageShell current="" width="max-w-4xl">
      <h1 className="pt-8 font-display text-4xl font-bold text-slate-50">Mes capsules</h1>
      <p className="mt-2 text-slate-300">Regarde-les autant de fois que tu veux, à vie.</p>
      {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
      {!list ? <div className="mt-8"><Spinner /></div> : (
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {list.map((c) => (
            <div key={c.slug} className={`${CARD} overflow-hidden`}>
              {c.cover_url && <img src={c.cover_url} alt="" className="aspect-video w-full object-cover" />}
              <div className="p-5">
                <p className="text-xs uppercase tracking-widest text-slate-400">{c.level} · {c.subject_area}</p>
                <h2 className="mt-1 font-display text-xl font-bold text-slate-50">{c.title}</h2>
                <p className="mt-1 text-sm text-slate-400">Revoir avant l’examen</p>
                <a href={`/capsule/${c.slug}`} className={`${CTA} mt-4`}>Regarder</a>
              </div>
            </div>
          ))}
          {list.length === 0 && !error && <p className="text-slate-300">Aucune capsule achetée avec ce courriel. <a className="underline" href="/capsules">Voir les capsules</a></p>}
        </div>
      )}
      <p className="mt-8 text-sm"><a className="underline" href="/capsules">Autres capsules</a></p>
    </PageShell>
  )
}
