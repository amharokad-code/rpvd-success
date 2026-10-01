// Analytics first-party, sans donnée personnelle (même table et même endpoint que le web :
// netlify/functions/track-event.js). Le `path` est préfixé « /m » pour distinguer le mobile du web.
// `checkout_completed` n'est PAS envoyé d'ici : seul le webhook serveur le sait de façon fiable.
import { API_URL, type Region } from '../config'

type EventType =
  | 'pageview'
  | 'cta_click'
  | 'age_gate_confirmed'
  | 'signup_started'
  | 'checkout_started'

export function trackEvent(eventType: EventType, screen: string, extra: { region?: Region; plan?: string } = {}) {
  try {
    void fetch(`${API_URL}/track-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: eventType, path: `/m/${screen}`, ...extra }),
    }).catch(() => {})
  } catch {
    // best-effort : ne doit jamais faire échouer le parcours
  }
}
