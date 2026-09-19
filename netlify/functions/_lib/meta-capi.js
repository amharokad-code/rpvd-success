'use strict';
// Meta Conversions API (server-side) : envoie l'événement 'Purchase' directement depuis le
// webhook Stripe, sans passer par le pixel front (contourne ad-blockers / ITP Safari).
// Secrets attendus en variables d'environnement Netlify — jamais en dur dans le code :
//   META_PIXEL_ID, META_CAPI_ACCESS_TOKEN, META_CAPI_TEST_EVENT_CODE (optionnel, mode test).
const crypto = require('crypto');

const GRAPH_VERSION = 'v21.0';

function sha256(value) {
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
}

// Best-effort : un échec d'envoi à Meta ne doit jamais faire échouer le webhook Stripe
// (le code d'activation est déjà créé et envoyé, c'est ce qui compte pour le client).
async function sendPurchaseEvent({ email, value, currency, eventId }) {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !accessToken) {
    console.warn('[meta-capi] META_PIXEL_ID ou META_CAPI_ACCESS_TOKEN manquant, événement ignoré.');
    return { sent: false };
  }

  const payload = {
    data: [
      {
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: 'website',
        user_data: {
          em: email ? [sha256(email)] : undefined,
        },
        custom_data: {
          value,
          currency,
        },
      },
    ],
  };
  if (process.env.META_CAPI_TEST_EVENT_CODE) {
    payload.test_event_code = process.env.META_CAPI_TEST_EVENT_CODE;
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      console.error('[meta-capi] Réponse Graph API en erreur :', response.status, body);
      return { sent: false };
    }
    return { sent: true, body };
  } catch (err) {
    console.error('[meta-capi] Envoi échoué :', err && err.message);
    return { sent: false };
  }
}

module.exports = { sendPurchaseEvent };
