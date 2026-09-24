'use strict';
// POST /.netlify/functions/age-gate-confirm
// Enregistre la confirmation d'âge par empreinte d'appareil (contrat conformité §1) — preuve
// d'audit COPPA/Loi 25/RGPD/UK GDPR. Best-effort, jamais bloquant côté frontend : toujours 200
// sauf requête malformée.

const { preflight, parseBody, json, header, handleError } = require('./_lib/http');
const { getServiceClient } = require('./_lib/supabase');

const REGIONS = ['qc', 'fr', 'us', 'uk'];

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;

  try {
    const fingerprint = header(event, 'x-device-fingerprint');
    if (!fingerprint) return json(200, { ok: false });

    const body = parseBody(event);
    const market = REGIONS.includes(body.market) ? body.market : 'qc';
    const ageConfirmed = Boolean(body.ageConfirmed);
    const parentAuthDeclared = Boolean(body.parentAuthDeclared);
    const blocked = Boolean(body.blocked);

    await getServiceClient()
      .from('age_gate_confirmations')
      .upsert(
        {
          device_fingerprint: fingerprint,
          market,
          age_confirmed: ageConfirmed,
          parent_auth_declared: parentAuthDeclared,
          blocked_coppa: blocked,
          confirmed_at: new Date().toISOString(),
        },
        { onConflict: 'device_fingerprint' },
      );

    return json(200, { ok: true });
  } catch (err) {
    return handleError(err, 'age-gate-confirm');
  }
};
