'use strict';
// POST /.netlify/functions/track-event
// Analytics first-party, SANS donnée personnelle : pas d'IP, pas de courriel, pas d'identifiant de compte.
// Un identifiant de session anonyme aléatoire (sid, généré dans le navigateur) relie les étapes d'un même
// visiteur pour mesurer l'entonnoir et le point exact où il s'arrête (voir admin-insights.js).
// Toujours 200 (best-effort : ne doit jamais bloquer l'UX ni remonter d'erreur visible).

const { preflight, parseBody, json } = require('./_lib/http');
const { getServiceClient } = require('./_lib/supabase');

// Entonnoir historique + nouvelles étapes de l'outil.
const LEGACY_TYPES = ['pageview', 'cta_click', 'age_gate_confirmed', 'signup_started', 'checkout_started', 'checkout_completed'];
const EVENT_TYPES = [
  ...LEGACY_TYPES,
  'app_opened',
  'file_selected',
  'analysis_started',
  'analysis_success',
  'analysis_error',
  'level_viewed',
  'paywall_shown',
  'client_error',
  'login_error',
];
const REGIONS = ['qc', 'fr', 'us', 'uk'];
const DEVICES = ['mobile', 'tablet', 'desktop'];
const PROP_KEYS = ['code', 'reason', 'level', 'mode', 'subject', 'kind', 'msg', 'stage'];
const MAX_PATH_LENGTH = 200;

// Message d'erreur « de classe » : sans chiffres longs, identifiants ni URL, borné.
function cleanMsg(value) {
  return String(value)
    .replace(/https?:\/\/\S+/g, '<url>')
    .replace(/[0-9a-f]{8,}/gi, '<id>')
    .replace(/\d{3,}/g, '#')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, 80);
}

function cleanProps(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const key of PROP_KEYS) {
    const v = raw[key];
    if (typeof v === 'number' && Number.isFinite(v)) out[key] = v;
    else if (typeof v === 'string' && v) out[key] = key === 'msg' ? cleanMsg(v) : v.slice(0, 40);
  }
  return out;
}

const SID = /^[a-z0-9]{8,32}$/i;

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;

  try {
    const body = parseBody(event);
    const eventType = EVENT_TYPES.includes(body.event_type) ? body.event_type : null;
    if (!eventType) return json(200, { ok: false });

    const row = {
      event_type: eventType,
      path: typeof body.path === 'string' ? body.path.slice(0, MAX_PATH_LENGTH) : null,
      region: REGIONS.includes(body.region) ? body.region : null,
      plan: typeof body.plan === 'string' ? body.plan.slice(0, 40) : null,
    };
    const rich = {
      sid: typeof body.sid === 'string' && SID.test(body.sid) ? body.sid : null,
      device: DEVICES.includes(body.device) ? body.device : null,
      source: typeof body.source === 'string' ? body.source.replace(/[^a-z0-9._:-]/gi, '').slice(0, 40) || null : null,
      props: cleanProps(body.props),
    };

    const db = getServiceClient();
    const { error } = await db.from('analytics_events').insert({ ...row, ...rich });
    if (error) {
      // Migration SQL pas encore passée (colonnes absentes / contrainte d'ancien type) : on garde au moins l'ancien format.
      if (LEGACY_TYPES.includes(eventType)) await db.from('analytics_events').insert(row).then(() => {}, () => {});
      else console.error('[track-event]', error.message);
    }

    return json(200, { ok: true });
  } catch (err) {
    console.error('[track-event]', err && err.message);
    return json(200, { ok: false });
  }
};
