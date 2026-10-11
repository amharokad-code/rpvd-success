'use strict';
// Mesure publicitaire côté serveur pour le Bootcamp : décision de consentement, construction des
// métadonnées Stripe et envoi du « Purchase » à Meta et à Snap (API de conversions).
//
// RÈGLE NON NÉGOCIABLE : rien ne part vers Meta ni Snap sans la case « mesure publicitaire »
// cochée par l'acheteur sur /reserver (non cochée d'avance). Elle voyage dans les métadonnées de la
// session Stripe sous la clé `mk` = '1'. Les identifiants (fbp, fbc, ScCid, IP, agent utilisateur)
// ne sont même pas inscrits dans les métadonnées sans cette case.
// Tout est best-effort : aucune erreur ici ne doit atteindre le client ni faire échouer le webhook.
const A = require('./attribution');
const metaCapi = require('./meta-capi');
const snapCapi = require('./snap-capi');

const PRODUCT_ID = 'bootcamp-rpvd';
const PRODUCT_NAME = 'Bootcamp RPVD';

// Décision unique, partagée par tous les chemins d'envoi.
function consentGranted(metadata) {
  return Boolean(metadata && metadata.mk === '1');
}

// Métadonnées de la session Stripe Checkout (50 clés max, 500 caractères par valeur).
function buildCheckoutMetadata({ sessionId, ticketId, eventId, consent, attribution, clientIds, ip, userAgent }) {
  const md = { kind: 'bootcamp', session_id: sessionId, ticket_id: ticketId, ev: eventId };
  const attr = attribution || {};
  for (const key of A.LABEL_KEYS) if (attr[key]) md[key] = String(attr[key]).slice(0, 500);
  if (consent === true) {
    md.mk = '1';
    const ids = clientIds || {};
    for (const key of ['fbp', 'fbc', 'sc_click_id', 'sc_cookie1']) if (ids[key]) md[key] = String(ids[key]).slice(0, 500);
    if (ip) md.client_ip = ip;
    if (userAgent) md.client_ua = userAgent;
  }
  return md;
}

// Paramètres d'envoi à partir d'une session Stripe payée (tout est revalidé : défense en profondeur).
function buildPurchaseParams(checkout, siteUrl) {
  const md = (checkout && checkout.metadata) || {};
  const email = String((checkout.customer_details && checkout.customer_details.email) || checkout.customer_email || '').trim().toLowerCase() || null;
  const eventId = A.cleanEventId(md.ev) || `p_${checkout.id}`;
  return {
    email,
    value: (checkout.amount_total || 0) / 100,
    currency: String(checkout.currency || 'cad').toUpperCase(),
    eventId,
    orderId: eventId,
    sourceUrl: `${siteUrl}/merci`,
    fbp: A.cleanFbp(md.fbp),
    fbc: A.cleanFbc(md.fbc),
    scClickId: A.cleanClickId(md.sc_click_id, 8, 300),
    scCookie1: A.cleanScCookie(md.sc_cookie1),
    clientIp: A.cleanIp(md.client_ip),
    userAgent: A.cleanUserAgent(md.client_ua),
    contentName: PRODUCT_NAME,
    contentIds: [PRODUCT_ID],
  };
}

// Appelée par le webhook Stripe APRÈS confirmation du billet. Ne lève jamais.
async function reportBootcampPurchase(checkout, { siteUrl, fetchImpl, env } = {}) {
  try {
    if (!checkout || !consentGranted(checkout.metadata)) return { skipped: 'no_consent' };
    const base = (siteUrl || (env || process.env).URL || 'https://rpvdsuccess.com').replace(/\/+$/, '');
    const params = buildPurchaseParams(checkout, base);
    const opts = {};
    if (fetchImpl) opts.fetchImpl = fetchImpl;
    if (env) opts.env = env;
    const [meta, snap] = await Promise.all([metaCapi.sendPurchaseEvent(params, opts), snapCapi.sendPurchaseEvent(params, opts)]);
    return { meta, snap };
  } catch (err) {
    console.error('[ad-conversions] reportBootcampPurchase a levé :', err && err.message);
    return { error: true };
  }
}

module.exports = { consentGranted, buildCheckoutMetadata, buildPurchaseParams, reportBootcampPurchase, PRODUCT_ID, PRODUCT_NAME };
