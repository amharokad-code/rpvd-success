// Mode démo (dev seulement, `?demo`) : sessions fictives pour voir le design sans serveur.
const DEMO = import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo')
const DEMO_SESSIONS = [
  ['13:00', 'Sec 4', 'Science (ST / STE)', 'Stœchiométrie', 'open', 23],
  ['15:00', 'Sec 5', 'Maths SN', 'Trigonométrie (cercle trigonométrique, fonctions, identités)', 'open', 4],
  ['17:00', 'Sec 2', 'Français', 'Accord du participe passé (arbre de décision)', 'last_call', 2],
  ['19:00', 'Sec 5', 'Chimie', 'Équilibre chimique (Kc, Le Chatelier)', 'full', 0],
].map(([slot, level, subject, topic, state, seats_left], i) => ({
  id: `00000000-0000-4000-8000-00000000000${i}`,
  slot,
  level,
  subject,
  topic,
  state,
  seats_left,
  capacity: 90,
  when: `dimanche 11 octobre à ${slot.replace(':00', ' h')}`,
  starts_at: `2026-10-11T${String(Number(slot.slice(0, 2)) + 4).padStart(2, '0')}:00:00Z`,
  duration_min: 90,
  refund_deadline: 'samedi 10 octobre à 23 h 59',
}))
function demoResponse(fn, body) {
  if (fn === 'bootcamp-public' && body.action === 'sessions') {
    return { sessions: DEMO_SESSIONS, cycle: { next_selection_at: '2026-10-08T21:00:00Z', sales_deadline: 'samedi 10 octobre à 23 h 59' } }
  }
  if (fn === 'bootcamp-public' && body.action === 'session') return { session: DEMO_SESSIONS.find((s) => s.id === body.id) || DEMO_SESSIONS[0] }
  if (fn === 'bootcamp-refund') {
    return { ticket: { ...DEMO_SESSIONS[0], price: '20,00 $', status: body.action === 'refund' ? 'refunded' : 'paid', refundable: body.action !== 'refund' } }
  }
  return { ok: true }
}

// Appels aux fonctions Netlify du Bootcamp (toutes en POST JSON).
export async function bootcampCall(fn, body = {}, headers = {}) {
  if (DEMO) return demoResponse(fn, body)
  let res
  try {
    res = await fetch(`/.netlify/functions/${fn}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('Connexion impossible. Vérifie ton internet et réessaie.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.message || 'Erreur. Réessaie dans un instant.')
    err.status = res.status
    throw err
  }
  return data
}

export function queryParam(name) {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(name)
}
