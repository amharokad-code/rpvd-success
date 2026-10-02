// Page d'administration du Bootcamp (/admin/bootcamp) — interne, protégée par le jeton
// BOOTCAMP_ADMIN_TOKEN (jamais stocké en dur : saisi par l'équipe, gardé en sessionStorage).
// Flux : décompte des votes → cocher les sujets retenus (+ date et lien) → essai à blanc → envoi.
import { useEffect, useState } from 'react'

const ENDPOINT = '/.netlify/functions/bootcamp-admin'
const TOKEN_KEY = 'rpvd_admin_token'

function loadToken() {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

async function call(token, payload) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(res.status === 401 ? 'Jeton refusé.' : data.message || data.error || `Erreur ${res.status}`)
  return data
}

const input = 'min-h-[44px] w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-slate-100'
const btn = 'min-h-[44px] rounded-xl bg-amber-500 px-5 font-bold text-slate-950 disabled:opacity-50'

export default function BootcampAdminPage() {
  const [token, setToken] = useState(loadToken)
  const [data, setData] = useState(null)
  const [picked, setPicked] = useState({}) // clé "niveau|matière|sujet" → { when, url, price }
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    document.title = 'Admin Bootcamp'
    let meta = document.querySelector('meta[name="robots"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'robots')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', 'noindex,nofollow')
  }, [])

  async function run(fn) {
    setBusy(true)
    setMsg(null)
    try {
      await fn()
    } catch (e) {
      setMsg({ kind: 'error', text: e.message })
    } finally {
      setBusy(false)
    }
  }

  const load = () =>
    run(async () => {
      const d = await call(token, { action: 'tally' })
      try {
        window.sessionStorage.setItem(TOKEN_KEY, token)
      } catch {
        /* sessionStorage indisponible : le jeton reste en mémoire */
      }
      setData(d)
    })

  const keyOf = (r) => `${r.level}|${r.subject}|${r.topic}`
  const toggle = (r) =>
    setPicked((p) => {
      const k = keyOf(r)
      const next = { ...p }
      if (next[k]) delete next[k]
      else next[k] = { when: 'dimanche à 14 h', url: '', price: '12 $' }
      return next
    })
  const edit = (k, field, value) => setPicked((p) => ({ ...p, [k]: { ...p[k], [field]: value } }))

  const selections = Object.entries(picked).map(([k, v]) => {
    const [level, subject, topic] = k.split('|')
    return { level, subject, topic, ...v }
  })
  const ready = selections.length > 0 && selections.every((s) => s.when.trim() && /^https:\/\//.test(s.url.trim()))

  const notify = (dry) =>
    run(async () => {
      if (!dry && !window.confirm('Envoyer les courriels à tous les votants non notifiés ?')) return
      const d = await call(token, { action: 'notify', dry_run: dry, selections })
      setMsg({
        kind: 'ok',
        text: dry
          ? `Essai à blanc : ${d.pending} votant(s) à notifier, ${d.selected} « retenu », ${d.not_selected} « pas cette semaine ». Rien envoyé.`
          : `Envoyé : ${d.sent} courriel(s), ${d.failed} échec(s) (relance possible).`,
      })
    })

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-5 py-10 text-slate-200">
      <h1 className="font-display text-3xl font-bold text-slate-50">Admin Bootcamp</h1>
      <p className="mt-1 text-sm text-slate-400">Décompte des votes de la semaine et envoi des courriels de sélection.</p>

      <div className="mt-6 flex gap-2">
        <input type="password" autoComplete="off" placeholder="Jeton admin" value={token} onChange={(e) => setToken(e.target.value)} className={input} />
        <button type="button" disabled={busy || !token} onClick={load} className={btn}>
          {data ? 'Actualiser' : 'Charger'}
        </button>
      </div>

      {msg && (
        <p role="status" className={`mt-4 rounded-xl border px-4 py-3 text-sm ${msg.kind === 'error' ? 'border-rose-500/40 bg-rose-500/10 text-rose-200' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'}`}>
          {msg.text}
        </p>
      )}

      {data && (
        <>
          <h2 className="mt-8 font-display text-xl font-bold text-slate-50">
            Semaine du {data.week_key} · {data.total_votes} vote(s)
          </h2>
          <ul className="mt-3 space-y-2">
            {data.tally.map((r) => {
              const k = keyOf(r)
              const on = Boolean(picked[k])
              return (
                <li key={k} className={`rounded-xl border p-3 ${on ? 'border-amber-500/50 bg-amber-500/5' : 'border-white/10 bg-white/[0.03]'}`}>
                  <label className="flex cursor-pointer items-center gap-3">
                    <input type="checkbox" checked={on} onChange={() => toggle(r)} className="h-5 w-5 accent-amber-500" />
                    <span className="flex-1 text-sm">
                      <b className="text-slate-50">{r.topic}</b> · {r.level} · {r.subject}
                    </span>
                    <span className="font-mono text-amber-400">{r.votes}</span>
                  </label>
                  {on && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <input value={picked[k].when} onChange={(e) => edit(k, 'when', e.target.value)} placeholder="Quand (ex. dimanche à 14 h)" className={input} />
                      <input value={picked[k].url} onChange={(e) => edit(k, 'url', e.target.value)} placeholder="Lien Calendly (https://…)" className={input} />
                      <input value={picked[k].price} onChange={(e) => edit(k, 'price', e.target.value)} placeholder="Prix (ex. 12 $)" className={input} />
                    </div>
                  )}
                </li>
              )
            })}
            {data.tally.length === 0 && <li className="text-sm text-slate-400">Aucun vote cette semaine.</li>}
          </ul>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" disabled={busy || !ready} onClick={() => notify(true)} className="min-h-[44px] rounded-xl border border-white/20 px-5 font-semibold disabled:opacity-50">
              Essai à blanc
            </button>
            <button type="button" disabled={busy || !ready} onClick={() => notify(false)} className={btn}>
              Envoyer les courriels
            </button>
          </div>
          {!ready && selections.length > 0 && <p className="mt-2 text-xs text-slate-500">Chaque sujet retenu doit avoir une date et un lien https.</p>}
        </>
      )}
    </div>
  )
}
