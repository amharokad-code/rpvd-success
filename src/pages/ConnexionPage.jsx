// /connexion : l'acheteur retape son courriel et reçoit un nouveau lien à usage unique (accès à vie,
// 2 appareils autorisés). Page privée : noindex.
import { useEffect, useState } from 'react'
import { bootcampCall } from '../lib/bootcampApi'
import { getDeviceFingerprint } from '../utils/security-fingerprint'
import { CARD, CTA, INPUT, Notice, PageShell, Spinner } from '../components/bootcamp/BootcampUI'

export default function ConnexionPage() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle')
  const [error, setError] = useState(null)

  useEffect(() => {
    document.title = 'Connexion — Mes capsules'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
  }, [])

  async function submit(e) {
    e.preventDefault()
    setState('busy')
    setError(null)
    try {
      const fingerprint = await getDeviceFingerprint()
      await bootcampCall('request-login-link', { email }, { 'x-device-fingerprint': fingerprint })
      setState('done')
    } catch (err) {
      setError(err.message)
      setState('idle')
    }
  }

  return (
    <PageShell current="" width="max-w-xl">
      <h1 className="pt-8 font-display text-4xl font-bold text-slate-50">Mes capsules</h1>
      <p className="mt-2 text-slate-300">Entre le courriel utilisé pour l’achat. Tu reçois un lien de connexion, valable une seule fois.</p>
      <div className={`${CARD} mt-6 p-5`}>
        {state === 'done' ? (
          <Notice tone="ok">Si ce courriel a un achat, un lien vient de partir. Vérifie aussi les indésirables.</Notice>
        ) : (
          <form onSubmit={submit} className="grid gap-4">
            <input className={INPUT} type="email" required placeholder="Ton courriel" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} />
            {error && <Notice tone="error">{error}</Notice>}
            <button className={CTA} disabled={state === 'busy'}>{state === 'busy' ? <Spinner /> : 'Recevoir mon lien'}</button>
          </form>
        )}
      </div>
    </PageShell>
  )
}
