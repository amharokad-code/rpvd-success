'use strict';
// Meta Conversions API (côté serveur) : envoie l'événement « Purchase » depuis le webhook Stripe,
// sans passer par le pixel du navigateur (contourne bloqueurs de pub et ITP Safari).
// CONSENTEMENT : ce module ne décide de rien, il envoie ce qu'on lui donne. La décision (case
// cochée par l'acheteur) est prise AVANT, dans _lib/ad-conversions.js. Ne jamais l'appeler sans.
// Secrets attendus en variables d'environnement Netlify — jamais en dur dans le code :
//   META_PIXEL_ID, META_CAPI_ACCESS_TOKEN, META_CAPI_TEST_EVENT_CODE (optionnel), META_GRAPH_VERSION (optionnel).
// Doc : https://developers.facebook.com/docs/marketing-api/conversions-api/using-the-api
const crypto = require('crypto');

const DEFAULT_GRAPH_VERSION = 'v25.0'; // v25.0 publiée le 18 février 2026 ; surchargeable par META_GRAPH_VERSION

function sha256(value) {
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
}

function graphVersion(env = process.env) {
  return /^v\d+\.\d+$/.test(env.META_GRAPH_VERSION || '') ? env.META_GRAPH_VERSION : DEFAULT_GRAPH_VERSION;
}

// Construction pure du corps de requête (testée sans réseau). Les champs absents sont omis.
function buildPurchasePayload({ email, value, currency, eventId, eventTime, sourceUrl, fbp, fbc, clientIp, userAgent, contentName, contentIds, testEventCode }) {
  const userData = {};
  if (email) userData.em = [sha256(email)]; // seul le haché quitte le serveur
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;
  if (clientIp) userData.client_ip_address = clientIp;
  if (userAgent) userData.client_user_agent = userAgent;

  const customData = { value, currency };
  if (contentIds && contentIds.length) {
    customData.content_type = 'product';
    customData.content_ids = contentIds;
    customData.num_items = 1;
  }
  if (contentName) customData.content_name = contentName;

  const event = {
    event_name: 'Purchase',
    event_time: eventTime || Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: 'website',
    user_data: userData,
    custom_data: customData,
  };
  if (sourceUrl) event.event_source_url = sourceUrl;

  const payload = { data: [event] };
  if (testEventCode) payload.test_event_code = testEventCode;
  return payload;
}

// Best-effort : un échec d'envoi à Meta ne doit jamais faire échouer le webhook Stripe
// (le billet est déjà confirmé et le courriel envoyé, c'est ce qui compte pour le client).
async function sendPurchaseEvent(params, { fetchImpl = globalThis.fetch, env = process.env } = {}) {
  const pixelId = env.META_PIXEL_ID;
  const accessToken = env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !accessToken) {
    console.warn('[meta-capi] META_PIXEL_ID ou META_CAPI_ACCESS_TOKEN manquant, événement ignoré.');
    return { sent: false, skipped: 'not_configured' };
  }

  const payload = buildPurchasePayload({ ...params, testEventCode: env.META_CAPI_TEST_EVENT_CODE || undefined });
  const url = `https://graph.facebook.com/${graphVersion(env)}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`;

  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined, // jamais bloquer le webhook
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      console.error('[meta-capi] Réponse Graph API en erreur :', response.status, body && body.error ? body.error.message : '');
      return { sent: false };
    }
    return { sent: true, body };
  } catch (err) {
    console.error('[meta-capi] Envoi échoué :', err && err.message);
    return { sent: false };
  }
}

module.exports = { sendPurchaseEvent, buildPurchasePayload, graphVersion, sha256 };
