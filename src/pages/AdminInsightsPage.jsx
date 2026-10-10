// Tableau de bord « où ça bloque » (/admin/insights) : entonnoir, points de sortie, erreurs, santé du moteur,
// activation / rétention / churn et diagnostics en clair. 100 % anonyme : aucun courriel, aucune IP, aucun compte.
// Protégé par BOOTCAMP_ADMIN_TOKEN (saisi par l'équipe, gardé le temps de l'onglet).
import { useCallback, useEffect, useState } from 'react'

const TOKEN_KEY = 'rpvd_admin_token'
const readToken = () => {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}
const nf = (v, suffix = '') => (v == null ? '—' : `${v}${suffix}`)
const sec = (ms) => (ms == null ? '—' : `${(ms / 1000).toFixed(1).replace('.', ',')} s`)

const SEV = {
  high: 'border-rose-500/40 bg-rose-500/10 text-rose-100',
  medium: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
  info: 'border-slate-500/30 bg-white/[0.03] text-slate-200',
}
const SEV_LABEL = { high: 'Urgent', medium: 'À corriger', info: 'À savoir' }

function Section({ title, hint, children }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
      <h2 className="font-display text-xl font-bold text-slate-50">{title}</h2>
      {hint && <p className="mt-1 text-sm text-slate-400">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Stat({ label, value, sub, tone }) {
  const color = tone === 'bad' ? 'text-rose-300' : tone === 'good' ? 'text-emerald-300' : 'text-slate-50'
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

function Bars({ rows, valueKey = 'n', labelKey = 'key', total }) {
  const max = Math.max(1, ...rows.map((r) => r[valueKey]))
  if (!rows.length) return <p className="text-sm text-slate-500">Aucune donnée.</p>
  return (
    <ul className="space-y-1.5">
      {rows.map((r, i) => (
        <li key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm">
          <span className="truncate text-slate-200">{r[labelKey]}</span>
          <span className="font-mono tabular-nums text-slate-300">
            {r[valueKey]}
            {total ? <span className="text-slate-500"> · {Math.round((r[valueKey] / total) * 100)} %</span> : null}
          </span>
          <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-white/5">
            <span className="block h-full rounded-full bg-[#f2994a]/70" style={{ width: `${(r[valueKey] / max) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  )
}

function Table({ head, rows }) {
  if (!rows.length) return <p className="text-sm text-slate-500">Aucune donnée.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-slate-400">
            {head.map((h) => (
              <th key={h} className="py-2 pr-3 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((r, i) => (
            <tr key={i} className="text-slate-200">
              {r.map((c, j) => (
                <td key={j} className="py-2 pr-3 font-mono tabular-nums">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Funnel({ steps }) {
  // La plus grosse fuite (le plus de sessions perdues, assez de volume) est mise en évidence.
  let worst = -1
  let worstLost = 0
  steps.forEach((s, i) => {
    if (i > 0 && steps[i - 1].sessions >= 10 && s.from_prev_pct != null && s.from_prev_pct < 90 && s.lost > worstLost) {
      worst = i
      worstLost = s.lost
    }
  })
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li key={s.id}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
            <span className={`font-semibold ${i === worst ? 'text-rose-300' : 'text-slate-100'}`}>
              {i + 1}. {s.label}
              {i === worst && ' ← plus grosse fuite'}
            </span>
            <span className="font-mono tabular-nums text-slate-300">
              {s.sessions}
              {i > 0 && (
                <span className="text-slate-500">
                  {' '}· {nf(s.from_prev_pct, ' %')} de l’étape d’avant · −{s.lost}
                </span>
              )}
            </span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/5">
            <div className={`h-full rounded-full ${i === worst ? 'bg-rose-400/80' : 'bg-[#f2994a]/80'}`} style={{ width: `${s.from_start_pct ?? 0}%` }} />
          </div>
        </li>
      ))}
    </ol>
  )
}

export default function AdminInsightsPage() {
  const [token, setToken] = useState(readToken)
  const [draft, setDraft] = useState('')
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('idle') // idle | loading | error
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setStatus('loading')
    setError('')
    try {
      const res = await fetch('/.netlify/functions/admin-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ days }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.status === 401) {
        try {
          window.sessionStorage.removeItem(TOKEN_KEY)
        } catch {
          // ignoré
        }
        setToken('')
        throw new Error('Jeton refusé.')
      }
      if (!res.ok) throw new Error(body.message || `Erreur ${res.status}`)
      setData(body)
      setStatus('idle')
    } catch (e) {
      setError(e.message || 'Erreur réseau.')
      setStatus('error')
    }
  }, [token, days])

  useEffect(() => {
    load()
  }, [load])

  function submitToken(e) {
    e.preventDefault()
    const v = draft.trim()
    if (!v) return
    try {
      window.sessionStorage.setItem(TOKEN_KEY, v)
    } catch {
      // ignoré
    }
    setToken(v)
    setDraft('')
  }

  if (!token) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
        <h1 className="font-display text-2xl font-bold text-slate-50">Où ça bloque</h1>
        {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
        <form onSubmit={submitToken} className="flex flex-col gap-3">
          <input
            type="password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Jeton admin"
            autoComplete="off"
            className="min-h-[48px] rounded-xl border border-white/15 bg-black/40 px-4 text-slate-100"
          />
          <button type="submit" className="min-h-[48px] rounded-xl bg-[#f2994a] px-4 font-semibold text-ink">Entrer</button>
        </form>
      </main>
    )
  }

  const d = data
  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-slate-50">Où ça bloque</h1>
          <p className="text-sm text-slate-400">Anonyme : aucun client identifié, seulement des comportements.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[7, 14, 30, 90].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={days === n}
              onClick={() => setDays(n)}
              className={`min-h-[44px] rounded-full px-4 text-sm font-semibold ${days === n ? 'bg-[#f2994a] text-ink' : 'border border-white/15 text-slate-300'}`}
            >
              {n} j
            </button>
          ))}
          <button type="button" onClick={load} className="min-h-[44px] rounded-full border border-white/15 px-4 text-sm font-semibold text-slate-200">
            {status === 'loading' ? '…' : 'Actualiser'}
          </button>
        </div>
      </header>

      {status === 'error' && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
      {!d && status === 'loading' && <p className="text-slate-400">Chargement…</p>}

      {d && (
        <>
          {d.warnings?.length > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {d.warnings.map((w, i) => (
                <p key={i}>⚠ {w}</p>
              ))}
            </div>
          )}

          <Section title="À corriger d’abord" hint={`${d.sessions} sessions · ${d.events} événements sur ${d.days} jours.`}>
            {d.diagnostics.length === 0 ? (
              <p className="text-sm text-slate-400">Rien d’alarmant détecté sur cette période.</p>
            ) : (
              <ul className="space-y-3">
                {d.diagnostics.map((x, i) => (
                  <li key={i} className={`rounded-2xl border px-4 py-3 ${SEV[x.severity]}`}>
                    <p className="text-xs font-bold uppercase tracking-wide opacity-80">{SEV_LABEL[x.severity]}</p>
                    <p className="mt-0.5 font-semibold">{x.title}</p>
                    <p className="mt-1 text-sm opacity-90">{x.evidence}</p>
                    <p className="mt-2 text-sm"><span className="font-semibold">Quoi faire : </span>{x.fix}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Entonnoir" hint="Combien de visiteurs (sessions anonymes) atteignent chaque étape.">
            <Funnel steps={d.funnel} />
          </Section>

          <div className="grid gap-5 lg:grid-cols-2">
            <Section title="Où ils s’arrêtent" hint="Le dernier événement de chaque session.">
              <Bars rows={d.last_events.map((r) => ({ key: r.last_event, n: r.sessions }))} total={d.sessions} />
            </Section>
            <Section title="Paiement" hint="Du mur de paiement jusqu’à la vente (le « réussi » vient du serveur).">
              <Table head={['Étape', 'Sessions', 'De l’étape d’avant']} rows={d.money.map((m) => [m.label, m.sessions, nf(m.from_prev_pct, ' %')])} />
            </Section>
          </div>

          {d.guest && (d.guest.opened > 0 || d.guest.started > 0) && (
            <Section title="Essai sans compte" hint="Une analyse avant tout courriel : est-ce que ça mène à des inscriptions ?">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <Stat label="L’ouvrent" value={d.guest.opened} />
                <Stat label="Choisissent une photo" value={d.guest.picked} />
                <Stat label="Analyses lancées" value={d.guest.started} />
                <Stat label="Fiches reçues" value={d.guest.success} tone={d.guest.started > 0 && d.guest.success / d.guest.started < 0.7 ? 'bad' : 'good'} />
                <Stat label="S’inscrivent ensuite" value={nf(d.guest.signed_up_after_pct, ' %')} sub={`Clic « créer mon compte » : ${nf(d.guest.signup_click_pct, ' %')}`} />
              </div>
              {d.guest.errors_by_code.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-semibold text-slate-300">Erreurs de l’essai</p>
                  <Bars rows={d.guest.errors_by_code} />
                </div>
              )}
            </Section>
          )}

          <Section title="Qui décroche : appareil, source, région" hint="Part des sessions qui cliquent, se connectent, reçoivent une fiche.">
            <div className="grid gap-6 lg:grid-cols-3">
              {[['Appareil', d.devices], ['Source', d.sources], ['Région', d.regions]].map(([name, rows]) => (
                <div key={name}>
                  <p className="mb-2 text-sm font-semibold text-slate-300">{name}</p>
                  <Table head={['', 'Sess.', 'Clic', 'Connecté', 'Fiche']} rows={rows.map((r) => [r.key, r.sessions, nf(r.cta_pct, '%'), nf(r.connecte_pct, '%'), nf(r.fiche_pct, '%')])} />
                </div>
              ))}
            </div>
          </Section>

          <div className="grid gap-5 lg:grid-cols-2">
            <Section title="Erreurs d’analyse" hint={`${d.errors.analysis_started} analyses lancées · ${nf(d.errors.analysis_error_rate_pct, ' %')} en erreur.`}>
              <Bars rows={d.errors.analysis_by_code} />
              {d.errors.login_errors.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-sm font-semibold text-slate-300">Erreurs de connexion</p>
                  <Bars rows={d.errors.login_errors} />
                </div>
              )}
            </Section>
            <Section title="Erreurs JavaScript" hint="Plantages réels vus chez les visiteurs.">
              {d.errors.client_errors.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {d.errors.client_errors.map((e, i) => (
                    <li key={i} className="rounded-xl bg-black/30 px-3 py-2 text-slate-200">
                      <span className="font-mono text-rose-300">{e.n}×</span> {e.error}
                      {e.devices.length > 0 && <span className="text-slate-500"> · {e.devices.join(', ')}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <Section title="Santé du moteur (analyses)" hint={`${d.engine.calls} appels sur la période.`}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Stat label="Réussies" value={nf(d.engine.ok_pct, ' %')} tone={(d.engine.ok_pct ?? 100) >= 90 ? 'good' : 'bad'} />
              <Stat label="Incomplètes" value={nf(d.engine.incomplet_pct, ' %')} tone={(d.engine.incomplet_pct ?? 0) >= 15 ? 'bad' : undefined} />
              <Stat label="En erreur" value={nf(d.engine.erreur_pct, ' %')} tone={(d.engine.erreur_pct ?? 0) >= 5 ? 'bad' : undefined} />
              <Stat label="Latence médiane" value={sec(d.engine.latency_p50_ms)} />
              <Stat label="Latence p95" value={sec(d.engine.latency_p95_ms)} tone={(d.engine.latency_p95_ms ?? 0) > 20000 ? 'bad' : undefined} />
            </div>
            <div className="mt-5 grid gap-6 lg:grid-cols-3">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-300">Modèles utilisés</p>
                <Bars rows={d.engine.by_model} total={d.engine.calls} />
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-300">Mode</p>
                <Bars rows={d.engine.by_mode} total={d.engine.calls} />
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-300">Confiance</p>
                <Bars rows={d.engine.by_confiance} total={d.engine.calls} />
              </div>
            </div>
            {d.engine.worst_patterns.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-semibold text-slate-300">Types d’exercices les plus fragiles (incomplet, erreur ou confiance basse)</p>
                <Table head={['pattern_key', 'Appels', 'Problèmes']} rows={d.engine.worst_patterns.map((p) => [p.pattern_key, p.calls, `${p.bad_pct} %`])} />
              </div>
            )}
          </Section>

          <Section title="Activation, rétention, churn" hint="Calculé à partir des comptes et des analyses ; seulement des totaux.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Nouveaux inscrits" value={d.retention.signups} />
              <Stat label="Activés (≥ 1 analyse)" value={nf(d.retention.activation_pct, ' %')} sub={`${d.retention.activated} personnes`} tone={(d.retention.activation_pct ?? 100) < 50 ? 'bad' : undefined} />
              <Stat label="1re analyse (médiane)" value={d.retention.first_analysis_median_h == null ? '—' : `${d.retention.first_analysis_median_h} h`} />
              <Stat label="Reviennent à 7 jours" value={nf(d.retention.d7_pct, ' %')} sub={`J+1 : ${nf(d.retention.d1_pct, ' %')}`} />
              <Stat label="Abonnés" value={d.retention.paid_total} />
              <Stat label="Actifs (7 j)" value={d.retention.paid_active_7d} tone="good" />
              <Stat label="Endormis (8-30 j)" value={d.retention.paid_dormant_8_30d} />
              <Stat label="Inactifs 30 j+ (risque)" value={d.retention.paid_inactive_30d_plus} tone={d.retention.paid_inactive_30d_plus > 0 ? 'bad' : undefined} />
              <Stat label="Expirent sous 7 j" value={d.retention.expiring_7d} />
              <Stat label="Partis (période)" value={d.retention.churned_in_window} tone={d.retention.churned_in_window > 0 ? 'bad' : undefined} />
              <Stat label="Gratuits à 0 crédit" value={d.retention.free_out_of_credits} sub="n’ont pas converti" />
            </div>
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold text-slate-300">Cohortes par semaine d’inscription</p>
              <Table head={['Semaine du', 'Inscrits', 'Activés']} rows={d.retention.weeks.map((w) => [w.week_start, w.signups, nf(w.activated_pct, ' %')])} />
            </div>
          </Section>

          <Section title="Visites par jour">
            <Bars rows={d.pageviews_per_day.map((r) => ({ key: r.day, n: r.n }))} />
          </Section>
        </>
      )}
    </main>
  )
}
