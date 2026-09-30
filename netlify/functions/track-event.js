'use strict';
// POST /.netlify/functions/track-event
// Analytics v1, first-party, sans donnée personnelle (contrat honnêteté commerciale — même
// principe que le refus des trackers tiers) : compte les visites et l'entonnoir de conversion
// (page vue → clic CTA → AgeGate confirmé → connexion démarrée → checkout démarré/complété).
// Toujours 200 (best-effort, ne doit jamais bloquer l'UX ni remonter d'erreur visible).

const { preflight, parseBody, json } = require('./_lib/http');
const { getServiceClient } = require('./_lib/supabase');

const EVENT_TYPES = [
  'pageview',
  'cta_click',
  'age_gate_confirmed',
  'signup_started',
  'checkout_started',
  'checkout_completed',
];
const REGIONS = ['qc', 'fr', 'us', 'uk'];
const MAX_PATH_LENGTH = 200;

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;

  try {
    const body = parseBody(event);
    const eventType = EVENT_TYPES.includes(body.event_type) ? body.event_type : null;
    if (!eventType) return json(200, { ok: false });

    const path = typeof body.path === 'string' ? body.path.slice(0, MAX_PATH_LENGTH) : null;
    const region = REGIONS.includes(body.region) ? body.region : null;
    const plan = typeof body.plan === 'string' ? body.plan.slice(0, 40) : null;

    await getServiceClient()
      .from('analytics_events')
      .insert({ event_type: eventType, path, region, plan })
      .then(() => {}, (e) => console.error('[track-event]', e.message));

    return json(200, { ok: true });
  } catch (err) {
    console.error('[track-event]', err && err.message);
    return json(200, { ok: false });
  }
};
