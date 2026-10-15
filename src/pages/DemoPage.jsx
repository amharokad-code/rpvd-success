// /demo : la démo gratuite (lien reçu par courriel après le sondage). Privé : noindex, exclu de robots.txt.
import { useEffect } from 'react'
import DemoReward from '../components/DemoReward'
import { CARD, LegalLinks, PageShell } from '../components/bootcamp/BootcampUI'

export default function DemoPage() {
  useEffect(() => {
    document.title = 'Ta démo gratuite — RPVD'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
  }, [])
  return (
    <PageShell current="" width="max-w-3xl">
      <div className={`${CARD} mt-6 p-6`}>
        <DemoReward />
      </div>
      <LegalLinks />
    </PageShell>
  )
}
