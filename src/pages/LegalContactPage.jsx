// Formulaire de contact légal (RGPD/Loi 25) — capté par Netlify Forms, aucun backend requis.
// Rendu par le même routeur statique que LegalPage (src/main.jsx), sans authentification.
import { useState } from 'react'

function detectLang() {
  try {
    const region = window.localStorage.getItem('rpvd_region')
    return region === 'us' || region === 'uk' ? 'en' : 'fr'
  } catch {
    return 'fr'
  }
}

const COPY = {
  fr: {
    back: '← Retour à RPVD Success',
    title: 'Contact légal',
    emailLabel: 'Ton courriel',
    typeLabel: 'Type de demande',
    types: [
      { value: 'access', label: "Droit d'accès (RGPD / Loi 25)" },
      { value: 'delete', label: "Droit à l'effacement (« droit à l'oubli »)" },
      { value: 'rectify', label: 'Rectification de données' },
      { value: 'parental', label: 'Consentement parental' },
      { value: 'breach', label: 'Signaler une brèche de sécurité' },
      { value: 'other', label: 'Autre' },
    ],
    messageLabel: 'Ton message',
    submit: 'Envoyer',
    sentTitle: '✓ Demande reçue',
    sentBody: 'Nous répondons sous 30 jours (RGPD) ou 20 jours (Loi 25 au Québec).',
    directEmail: 'Ou directement par courriel : ',
  },
  en: {
    back: '← Back to RPVD Success',
    title: 'Legal Contact',
    emailLabel: 'Your email',
    typeLabel: 'Request type',
    types: [
      { value: 'access', label: 'Right of access (GDPR / UK GDPR)' },
      { value: 'delete', label: 'Right to erasure ("right to be forgotten")' },
      { value: 'rectify', label: 'Data rectification' },
      { value: 'parental', label: 'Parental consent' },
      { value: 'breach', label: 'Report a security breach' },
      { value: 'other', label: 'Other' },
    ],
    messageLabel: 'Your message',
    submit: 'Send',
    sentTitle: '✓ Request received',
    sentBody: 'We respond within 30 days (GDPR) or 20 days (Quebec Law 25).',
    directEmail: 'Or directly by email: ',
  },
}

const SUPPORT_EMAIL = 'support@rpvdsuccess.app'

// Encodage requis par Netlify Forms pour une soumission AJAX (form-encoded, pas JSON).
function encodeForNetlify(data) {
  return Object.keys(data)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
    .join('&')
}

export default function LegalContactPage() {
  const lang = detectLang()
  const c = COPY[lang]
  const [email, setEmail] = useState('')
  const [type, setType] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encodeForNetlify({ 'form-name': 'legal-contact', email, type, message }),
      })
      if (!res.ok) throw new Error('SUBMIT_FAILED')
      setSent(true)
    } catch {
      setError(lang === 'fr' ? "Envoi impossible. Réessaie ou écris directement à l'adresse ci-dessous." : 'Could not send. Try again or email us directly below.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 py-10 text-slate-200">
      <a href="/" className="text-sm text-amber-400 hover:underline">
        {c.back}
      </a>

      <h1 className="mt-6 font-display text-2xl font-bold text-slate-50">{c.title}</h1>

      {sent ? (
        <div className="mt-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <p className="font-semibold text-emerald-300">{c.sentTitle}</p>
          <p className="mt-2 text-sm leading-relaxed text-emerald-200">{c.sentBody}</p>
        </div>
      ) : (
        <form
          name="legal-contact"
          method="POST"
          data-netlify="true"
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-4"
        >
          <input type="hidden" name="form-name" value="legal-contact" />

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-slate-300">{c.emailLabel}</span>
            <input
              type="email"
              name="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="focus-ring min-h-[48px] rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2 text-slate-100"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-slate-300">{c.typeLabel}</span>
            <select
              name="type"
              required
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="focus-ring min-h-[48px] rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2 text-slate-100"
            >
              <option value="" disabled>
                —
              </option>
              {c.types.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-slate-300">{c.messageLabel}</span>
            <textarea
              name="message"
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="focus-ring rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2 text-slate-100"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="squishy focus-ring min-h-[48px] rounded-2xl bg-amber-500 font-bold text-slate-950 disabled:opacity-60"
          >
            {busy ? '…' : c.submit}
          </button>
        </form>
      )}

      <p className="mt-6 text-xs text-slate-500">
        {c.directEmail}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-amber-400 hover:underline">
          {SUPPORT_EMAIL}
        </a>
      </p>
    </div>
  )
}
