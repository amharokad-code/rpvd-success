// /desabonner?v=<vote> ou ?b=<billet> : ne plus recevoir les annonces du Bootcamp (LCAP).
// Un clic, aucune connexion, aucune question. Les courriels liés à un billet payé (confirmation,
// lien du cours, remboursement) continuent : ils exécutent le contrat.
import { useEffect, useState } from 'react'
import { bootcampCall, queryParam } from '../lib/bootcampApi'
import { CARD, CTA, LegalLinks, Notice, PageShell, Spinner } from '../components/bootcamp/BootcampUI'

export default function DesabonnerPage() {
  const v = queryParam('v')
  const b = queryParam('b')
  const [state, setState] = useState('idle') // idle | busy | done | error
  const [error, setError] = useState(null)

  useEffect(() => {
    document.title = 'Désabonnement — Bootcamp Gradus'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
  }, [])

  async function confirm() {
    setState('busy')
    setError(null)
    try {
      await bootcampCall('bootcamp-unsubscribe', v ? { v } : { b })
      setState('done')
    } catch (e) {
      setError(e.message)
      setState('error')
    }
  }

  return (
    <PageShell current="" width="max-w-xl">
      <h1 className="pt-8 font-display text-4xl font-bold text-slate-50">Ne plus recevoir les annonces</h1>
      <div className={`${CARD} mt-6 p-5 sm:p-6`}>
        {!v && !b ? (
          <Notice tone="error">Lien incomplet. Utilise le lien « Ne plus recevoir les annonces » de ton courriel.</Notice>
        ) : state === 'done' ? (
          <Notice tone="ok">C'est fait : tu ne recevras plus les annonces du Bootcamp Gradus. Si tu revotes un jour, tu recevras de nouveau le résultat du vote.</Notice>
        ) : (
          <>
            <p className="leading-relaxed text-slate-300">
              Tu ne recevras plus le résultat des votes, les places libérées ni les suivis. Si tu as un billet payé, tu recevras quand même sa confirmation et ton lien du cours.
            </p>
            {error && (
              <div className="mt-4">
                <Notice tone="error">{error}</Notice>
              </div>
            )}
            <button type="button" onClick={confirm} disabled={state === 'busy'} className={`${CTA} mt-5 w-full`}>
              {state === 'busy' ? <Spinner /> : 'Confirmer le désabonnement'}
            </button>
          </>
        )}
      </div>
      <LegalLinks />
    </PageShell>
  )
}
