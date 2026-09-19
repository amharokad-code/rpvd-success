'use strict';
// POST /.netlify/functions/stripe-webhook
// Reçoit `checkout.session.completed`, génère 1 code premium (idempotent par session.id)
// et l'envoie par courriel. Toute erreur inattendue → 500 pour que Stripe réessaie.

const Stripe = require('stripe');
const { HttpError, preflight, json, header, handleError } = require('./_lib/http');
const { rpc } = require('./_lib/supabase');
const { sendEmail, premiumCodeEmail } = require('./_lib/email');
const { PLANS, PREMIUM_CODE_VALIDITY_DAYS } = require('./_lib/codes');
const { sendPurchaseEvent } = require('./_lib/meta-capi');

let stripeClient = null;
function getStripe() {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY manquante');
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

// Vérifie la signature Stripe sur le corps brut (décodé si Netlify l'a encodé en base64).
function verifyEvent(event) {
  const signature = header(event, 'stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) throw new HttpError(400, 'BAD_REQUEST', 'Signature Stripe manquante.');
  const rawBody = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64') : event.body || '';
  try {
    return getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (_) {
    throw new HttpError(400, 'BAD_REQUEST', 'Signature Stripe invalide.');
  }
}

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;

  try {
    const stripeEvent = verifyEvent(event);

    if (stripeEvent.type !== 'checkout.session.completed') {
      return json(200, { received: true });
    }

    const session = stripeEvent.data.object;
    if (session.payment_status !== 'paid') {
      return json(200, { received: true });
    }

    const plan = session.metadata && session.metadata.plan;
    if (!PLANS[plan]) {
      // Plan inconnu : on ne peut rien générer, et un retry Stripe n'y changerait rien.
      console.error(`[stripe-webhook] Plan inconnu pour la session ${session.id}.`);
      return json(200, { received: true });
    }

    const email = (session.customer_details && session.customer_details.email) || session.customer_email || null;
    const expiresAt = new Date(Date.now() + PREMIUM_CODE_VALIDITY_DAYS * 24 * 3600 * 1000).toISOString();

    const codes = await rpc('create_activation_codes', {
      p_type: 'premium',
      p_plan: plan,
      p_credits: PLANS[plan].credits,
      p_count: 1,
      p_email: email,
      p_batch_id: null,
      p_stripe_session_id: session.id,
      p_expires_at: expiresAt,
    });

    // Tableau vide = session déjà traitée (idempotence).
    if (!Array.isArray(codes) || codes.length === 0) {
      return json(200, { received: true });
    }

    // CAPI 'Purchase' : best-effort, ne doit jamais faire échouer la réponse au webhook.
    // On l'attend (le runtime Netlify peut geler le process dès le `return`) mais on avale
    // toute erreur : `eventId` = session.id pour dédupliquer côté Meta si le pixel front l'envoie aussi.
    try {
      await sendPurchaseEvent({
        email,
        value: PLANS[plan].amount / 100,
        currency: 'CAD',
        eventId: session.id,
      });
    } catch (err) {
      console.error('[stripe-webhook] sendPurchaseEvent a levé :', err && err.message);
    }

    if (!email) {
      console.error(`[stripe-webhook] Session ${session.id} sans courriel : code créé en base, non envoyé.`);
      return json(200, { received: true });
    }

    const { sent } = await sendEmail({
      to: email,
      ...premiumCodeEmail({ code: codes[0], plan, credits: PLANS[plan].credits }),
    });
    if (!sent) console.error(`[stripe-webhook] Courriel non envoyé pour la session ${session.id} (code en base).`);

    return json(200, { received: true });
  } catch (err) {
    return handleError(err, 'stripe-webhook');
  }
};
