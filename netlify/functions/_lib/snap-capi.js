'use strict';
// Snap Conversions API v3 (côté serveur) : événement PURCHASE depuis le webhook Stripe.
// Même règle que meta-capi.js : la décision de consentement est prise en amont (ad-conversions.js).
// Variables : SNAP_PIXEL_ID, SNAP_CAPI_TOKEN (secret, serveur uniquement). Absentes = module inerte.
// Doc : https://developers.snap.com/api/marketing-api/Conversions-API/UsingTheAPI
//       déduplication : pixel `client_dedup_id` == CAPI `event_id` (fenêtre de 48 h)
const crypto = require('crypto');

function sha256(value) {
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
}

function buildPurchasePayload({ email, value, currency, eventId, eventTime, sourceUrl, scClickId, scCookie1, clientIp, userAgent, orderId, contentIds }) {
  const userData = {};
  if (email) userData.em = [sha256(email)];
  if (clientIp) userData.client_ip_address = clientIp;
  if (userAgent) userData.client_user_agent = userAgent;
  if (scClickId) userData.sc_click_id = scClickId;
  if (scCookie1) userData.sc_cookie1 = scCookie1;

  const customData = { value, currency };
  if (orderId) customData.order_id = orderId; // = transaction_id du pixel : repli de déduplication (30 jours)
  if (contentIds && contentIds.length) {
    customData.content_ids = contentIds;
    customData.num_items = 1;
  }

  return {
    data: [
      {
        event_name: 'PURCHASE',
        event_time: eventTime || Math.floor(Date.now() / 1000), // secondes
        event_id: eventId,
        action_source: 'WEB',
        event_source_url: sourceUrl,
        user_data: userData,
        custom_data: customData,
      },
    ],
  };
}

async function sendPurchaseEvent(params, { fetchImpl = globalThis.fetch, env = process.env } = {}) {
  const pixelId = env.SNAP_PIXEL_ID;
  const token = env.SNAP_CAPI_TOKEN;
  if (!pixelId || !token) {
    console.warn('[snap-capi] SNAP_PIXEL_ID ou SNAP_CAPI_TOKEN manquant, événement ignoré.');
    return { sent: false, skipped: 'not_configured' };
  }
  const url = `https://tr.snapchat.com/v3/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(token)}`;
  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPurchasePayload(params)),
      signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined, // jamais bloquer le webhook
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || (body && body.status && body.status !== 'VALID')) {
      console.error('[snap-capi] Réponse en erreur :', response.status, body && (body.reason || body.status));
      return { sent: false };
    }
    return { sent: true, body };
  } catch (err) {
    console.error('[snap-capi] Envoi échoué :', err && err.message);
    return { sent: false };
  }
}

module.exports = { sendPurchaseEvent, buildPurchasePayload, sha256 };
