// Tableau de bord interne du Bootcamp (/admin/bootcamp), protégé par BOOTCAMP_ADMIN_TOKEN
// (saisi par l'équipe, gardé le temps de l'onglet en sessionStorage, jamais dans le code).
// Tout tourne seul via la tâche planifiée ; cette page sert à voir, corriger et forcer.
import { useCallback, useEffect, useState } from 'react'
import { bootcampCall } from '../lib/bootcampApi'
import { CARD, CTA, CTA_GHOST, INPUT, Notice, Spinner } from '../components/bootcamp/BootcampUI'

const TOKEN_KEY = 'rpvd_admin_token'
const readToken = () => {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}
const money = (cents) => `${((cents || 0) / 100).toFixed(2).replace('.', ',')} $`
const STATE_LABEL = { open: 'En vente', last_call: 'Places libérées en vente', full: 'Complet', paused: 'Ventes fermées (attente dim. 8 h)', closed: 'Fermé', cancelled: 'Annulée' }
const SMALL_BTN = 'min-h-[40px] rounded-xl border border-white/15 px-3 text-sm font-semibold text-slate-200 transition hover:border-pyramid-orange/60 disabled:opacity-50'

function Health({ health }) {
  const items = [
    ['resend', 'Courriels (Resend)', 'RESEND_API_KEY manquante : aucun courriel ne part.'],
    ['email_from', 'Expéditeur vérifié', "EMAIL_FROM manquant ou en resend.dev : les élèves ne recevront rien."],
    ['stripe', 'Paiements (Stripe)', 'Clé ou secret webhook Stripe manquant.'],
    ['zoom', 'Zoom automatique', 'ZOOM_* manquants : colle un lien Zoom manuel sur chaque session.'],
    ['reply_to', 'Adresse de réponse', 'EMAIL_REPLY_TO manquant : les élèves ne peuvent pas répondre aux courriels.'],
    ['postal_address', 'Adresse postale légale', 'postalAddress vide dans src/legal/business.json (obligatoire : ventes en ligne et courriels d’annonce).'],
  ]
  return (
    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {items.map(([k, label, fix]) => (
        <div key={k} title={health[k] ? 'OK' : fix} className={`rounded-2xl border px-3 py-2 text-xs ${health[k] ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/30 bg-rose-500/10 text-rose-200'}`}>
          <p className="font-bold">{health[k] ? '✓' : '✕'} {label}</p>
          {!health[k] && <p className="mt-1 leading-snug opacity-80">{fix}</p>}
        </div>
      ))}
    </div>
  )
}

function SessionAdmin({ s, act, busy, zoomOn }) {
  const [link, setLink] = useState(s.manual_join_url || '')
  const [people, setPeople] = useState(null)
  const [copied, setCopied] = useState(false)
  const st = s.stats
  const freed = s.availability.state === 'last_call' ? s.availability.seats_left : 0
  const post = freed > 0
    ? `🔓 ${freed} place${freed > 1 ? 's' : ''} libérée${freed > 1 ? 's' : ''} suite à des désistements pour le Bootcamp Gradus « ${s.topic} » (${s.level}), ${s.when}. Premier arrivé, premier servi 👉 rpvdsuccess.com`
    : `🎯 Ce dimanche au Bootcamp Gradus : « ${s.topic} » (${s.level}), ${s.when}. 1 h 30 en direct, 20 $ tout inclus, ${s.availability.seats_left} places restantes 👉 rpvdsuccess.com`

  async function loadPeople() {
    const d = await act('attendees', { id: s.id }, { keepStatus: true })
    if (d) setPeople(d.attendees)
  }
  function exportCsv() {
    const rows = [['statut', 'courriel', 'nom', 'payé le', 'lien envoyé', 'zoom perso', 'source'], ...people.map((p) => [p.status, p.email || '', p.buyer_name || '', p.paid_at || '', p.link_sent_at || '', p.zoom_personal ? 'oui' : 'non', p.source || ''])]
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `participants-${s.slot.replace(':', 'h')}.csv`
    a.click()
  }

  return (
    <li className={`${CARD} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-bold text-pyramid-orange">{s.slot.replace(':00', ' h')}</p>
          <p className="font-display text-lg font-bold text-slate-50">{s.topic}</p>
          <p className="text-sm text-slate-400">
            {s.level} · {s.subject} · {s.votes_count} vote(s)
          </p>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300">{s.status === 'done' ? 'Terminée' : STATE_LABEL[s.availability.state] || s.availability.state}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
        {[
          ['Payés', `${st.paid} / ${s.capacity}`],
          ['En attente', st.pending],
          ['Remboursés', st.refunded],
          ['Places dispo', s.availability.seats_left],
          ['Revenu', money(st.revenueCents)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-black/40 px-2 py-2">
            <p className="text-lg font-bold text-slate-50">{v}</p>
            <p className="text-[11px] uppercase tracking-wider text-slate-500">{k}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-black/30 p-3 text-sm">
        {s.zoom_meeting_id ? (
          <p className="text-emerald-300">✓ Réunion Zoom créée automatiquement (n° {s.zoom_meeting_id}) : chaque élève reçoit un lien personnel.</p>
        ) : (
          <>
            {zoomOn && (
              <button type="button" disabled={busy} onClick={() => act('zoom_retry', { id: s.id })} className={`${SMALL_BTN} mb-3`}>
                Créer la réunion Zoom automatique
              </button>
            )}
            <p className="text-slate-300">Lien Zoom de la session (utilisé si l'API Zoom n'est pas configurée) :</p>
            <div className="mt-2 flex gap-2">
              <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://us02web.zoom.us/j/…" className={`${INPUT} min-h-[40px] text-sm`} />
              <button type="button" disabled={busy} onClick={() => act('update_session', { id: s.id, manual_join_url: link })} className={SMALL_BTN}>
                Enregistrer
              </button>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={loadPeople} className={SMALL_BTN}>
          Participants
        </button>
        <button type="button" disabled={busy || s.status === 'cancelled'} onClick={() => window.confirm('Envoyer maintenant le lien Zoom à tous les payés qui ne l’ont pas reçu ?') && act('send_links', { id: s.id })} className={SMALL_BTN}>
          Envoyer les liens maintenant
        </button>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(post).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            })
          }}
          className={SMALL_BTN}
        >
          {copied ? 'Copié ✓' : freed > 0 ? `Copier le post « ${freed} place(s) libérée(s) »` : 'Copier un post promo'}
        </button>
        {s.status === 'open' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => window.confirm(`Annuler « ${s.topic} » et rembourser automatiquement ${st.paid} élève(s) ?`) && act('cancel_session', { id: s.id })}
            className={`${SMALL_BTN} border-rose-500/40 text-rose-200 hover:border-rose-400`}
          >
            Annuler + rembourser tout
          </button>
        )}
      </div>

      {people && (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-300">{people.length} billet(s)</p>
            {people.length > 0 && (
              <button type="button" onClick={exportCsv} className="text-sm font-semibold text-pyramid-orange hover:underline">
                Exporter CSV
              </button>
            )}
          </div>
          <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-white/5">
            <table className="w-full text-left text-xs">
              <tbody>
                {people.map((p) => (
                  <tr key={p.id} className="border-b border-white/5">
                    <td className="px-2 py-1.5 text-slate-200">{p.email || '—'}</td>
                    <td className="px-2 py-1.5 text-slate-400">{p.status}</td>
                    <td className="px-2 py-1.5 text-slate-500">{p.link_sent_at ? 'lien ✓' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </li>
  )
}

export default function BootcampAdminPage() {
  const [token, setToken] = useState(readToken)
  const [week, setWeek] = useState(null)
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [picks, setPicks] = useState({}) // "niveau|matière|sujet" → créneau

  useEffect(() => {
    document.title = 'Admin Bootcamp — Gradus'
    let meta = document.querySelector('meta[name="robots"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'robots')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', 'noindex,nofollow')
  }, [])

  const act = useCallback(
    async (action, payload = {}, { keepStatus = false } = {}) => {
      setBusy(true)
      setMsg(null)
      try {
        const d = await bootcampCall('bootcamp-admin', { action, week_key: week || undefined, ...payload }, { 'x-admin-token': token })
        try {
          window.sessionStorage.setItem(TOKEN_KEY, token)
        } catch {
          /* sessionStorage indisponible : le jeton reste en mémoire */
        }
        if (!keepStatus && d.week_key) {
          setData(d)
          if (!week) setWeek(d.week_key)
        }
        if (d.result) setMsg({ tone: 'ok', text: describe(action, d.result) })
        else if (action === 'auto_select') setMsg({ tone: 'ok', text: `${d.created} session(s) créée(s).${d.notify ? ` Courriels : ${d.notify.sent} envoyé(s), ${d.notify.failed} échec(s).` : ''}` })
        return d
      } catch (e) {
        setMsg({ tone: 'error', text: e.status === 401 ? 'Jeton refusé.' : e.message })
        return null
      } finally {
        setBusy(false)
      }
    },
    [token, week],
  )

  useEffect(() => {
    if (week && data && data.week_key !== week) act('status')
  }, [week]) // eslint-disable-line react-hooks/exhaustive-deps

  function describe(action, r) {
    if (action === 'notify') {
      return r.dry_run
        ? `Essai à blanc : ${r.pending} votant(s) à notifier → ${r.selected} « SÉLECTIONNÉ », ${r.not_selected} « pas ce dimanche ». Rien envoyé.`
        : `Envoyé : ${r.sent}, échecs : ${r.failed} (une relance ne renvoie qu'aux échecs).`
    }
    if (action === 'send_links') return `Liens envoyés : ${r.sent}. Échecs : ${r.failed || 0}. En attente d'un lien : ${r.waiting || 0}.`
    if (action === 'cancel_session') return `Session annulée. Remboursés : ${r.refunded}. Échecs : ${r.failed}.`
    return 'Fait.'
  }

  const keyOf = (t) => `${t.level}|${t.subject}|${t.topic}`
  const usedSlots = new Set((data?.sessions || []).filter((s) => s.status !== 'cancelled').map((s) => s.slot))
  const freeSlots = (data?.slots || []).filter((s) => !usedSlots.has(s))
  const chosen = Object.entries(picks)
  const revenue = (data?.sessions || []).reduce((sum, s) => sum + (s.stats?.revenueCents || 0), 0)
  const sold = (data?.sessions || []).reduce((sum, s) => sum + (s.stats?.paid || 0), 0)

  function togglePick(t) {
    const k = keyOf(t)
    setPicks((p) => {
      const next = { ...p }
      if (next[k]) delete next[k]
      else {
        const taken = new Set(Object.values(next))
        next[k] = freeSlots.find((s) => !taken.has(s)) || freeSlots[0]
      }
      return next
    })
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-10 text-slate-200 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.3em] text-pyramid-orange">BOOTCAMP GRADUS</p>
          <h1 className="font-display text-3xl font-bold text-slate-50">Tableau de bord</h1>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <input type="password" autoComplete="off" placeholder="Jeton admin" value={token} onChange={(e) => setToken(e.target.value)} className={`${INPUT} min-h-[44px] sm:w-64`} />
          <button type="button" disabled={busy || !token} onClick={() => act('status')} className={`${CTA} min-h-[44px] px-5`}>
            {busy ? <Spinner /> : data ? 'Actualiser' : 'Entrer'}
          </button>
        </div>
      </div>

      {msg && (
        <div className="mt-4">
          <Notice tone={msg.tone}>{msg.text}</Notice>
        </div>
      )}

      {data && (
        <>
          <div className="mt-6">
            <Health health={data.health} />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {[
              ['previous', 'Semaine passée'],
              ['current', 'Cette semaine'],
              ['next', 'Semaine prochaine'],
            ].map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setPicks({})
                  setWeek(data.weeks[k])
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${data.week_key === data.weeks[k] ? 'bg-pyramid-orange text-[#0b0b0c]' : 'border border-white/15 text-slate-300'}`}
              >
                {label} {data.weeks.vote === data.weeks[k] ? '· votes en cours' : ''}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {[
              ['Sélection', data.schedule.selection],
              ['Fin des ventes', data.schedule.deadline],
              ['Billets vendus', `${sold}`],
              ['Revenu de la semaine', money(revenue)],
            ].map(([k, v]) => (
              <div key={k} className={`${CARD} rounded-2xl p-4`}>
                <p className="text-[11px] uppercase tracking-wider text-slate-500">{k}</p>
                <p className="mt-1 font-semibold text-slate-50">{v}</p>
              </div>
            ))}
          </div>

          <div className={`${CARD} mt-4 flex flex-wrap items-center gap-4 rounded-2xl p-4 text-sm`}>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={data.settings.auto_select} disabled={busy} onChange={(e) => act('settings', { auto_select: e.target.checked })} className="h-5 w-5 accent-[#f2994a]" />
              Sélection automatique du jeudi 17 h (top 4) + courriels
            </label>
            <label className="flex items-center gap-2">
              Places par session
              <input
                type="number"
                min="1"
                max="100"
                defaultValue={data.settings.capacity}
                onBlur={(e) => Number(e.target.value) !== data.settings.capacity && act('settings', { capacity: Number(e.target.value) })}
                className="w-20 rounded-lg border border-white/10 bg-black/50 px-2 py-1"
              />
            </label>
          </div>

          {/* VOTES */}
          <h2 className="mt-10 font-display text-2xl font-bold text-slate-50">
            Votes <span className="text-base font-normal text-slate-500">· {data.votes.total} au total, {data.votes.notified} notifié(s)</span>
          </h2>
          <ul className="mt-3 space-y-2">
            {data.tally.map((t, i) => {
              const k = keyOf(t)
              const on = Boolean(picks[k])
              const isOther = t.topic === 'Autre sujet'
              return (
                <li key={k} className={`rounded-2xl border p-3 ${on ? 'border-pyramid-orange/60 bg-pyramid-orange/5' : 'border-white/10 bg-white/[0.02]'}`}>
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-mono text-sm text-slate-500">{i + 1}</span>
                    <input type="checkbox" disabled={isOther || (!on && freeSlots.length === 0)} checked={on} onChange={() => togglePick(t)} className="h-5 w-5 accent-[#f2994a]" />
                    <span className="flex-1 text-sm">
                      <b className="text-slate-50">{t.topic}</b> <span className="text-slate-400">· {t.level} · {t.subject}</span>
                      {isOther && t.others.length > 0 && <span className="block text-xs text-slate-500">Précisions : {t.others.join(' · ')}</span>}
                    </span>
                    {on && (
                      <select value={picks[k]} onChange={(e) => setPicks((p) => ({ ...p, [k]: e.target.value }))} className="rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-sm">
                        {freeSlots.map((s) => (
                          <option key={s} value={s}>
                            {s.replace(':00', ' h')}
                          </option>
                        ))}
                      </select>
                    )}
                    <span className="w-10 text-right font-mono font-bold text-pyramid-orange">{t.votes}</span>
                  </div>
                </li>
              )
            })}
            {data.tally.length === 0 && <li className="text-sm text-slate-500">Aucun vote pour cette semaine.</li>}
          </ul>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={busy || freeSlots.length === 0 || data.tally.length === 0} onClick={() => window.confirm('Créer les sessions du top 4 et envoyer les courriels aux votants ?') && act('auto_select', { notify: true })} className={CTA}>
              Sélection auto (top 4) + courriels
            </button>
            <button
              type="button"
              disabled={busy || chosen.length === 0}
              onClick={() =>
                act('create_sessions', {
                  picks: chosen.map(([k, slot]) => {
                    const [level, subject, topic] = k.split('|')
                    const t = data.tally.find((x) => keyOf(x) === k)
                    return { level, subject, topic, slot, votes: t ? t.votes : 0 }
                  }),
                }).then((d) => d && setPicks({}))
              }
              className={CTA_GHOST}
            >
              Créer {chosen.length || ''} session(s) choisie(s)
            </button>
            <button type="button" disabled={busy || !data.sessions.length} onClick={() => act('notify', { dry_run: true })} className={CTA_GHOST}>
              Essai à blanc des courriels
            </button>
            <button type="button" disabled={busy || !data.sessions.length} onClick={() => window.confirm('Envoyer les courriels « SÉLECTIONNÉ » / « pas ce dimanche » à tous les votants non notifiés ?') && act('notify', { dry_run: false })} className={CTA_GHOST}>
              Envoyer aux votants
            </button>
          </div>

          {/* SESSIONS */}
          <h2 className="mt-10 font-display text-2xl font-bold text-slate-50">Sessions du {data.schedule.sunday}</h2>
          <ul className="mt-3 space-y-3">
            {data.sessions.map((s) => (
              <SessionAdmin key={s.id} s={s} act={act} busy={busy} zoomOn={data.health.zoom} />
            ))}
            {data.sessions.length === 0 && <li className="text-sm text-slate-500">Aucune session pour cette semaine.</li>}
          </ul>
        </>
      )}
    </div>
  )
}
