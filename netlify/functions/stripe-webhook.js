'use strict';
// POST /.netlify/functions/stripe-webhook
// Contrat pricing v3 (abonnement récurrent Basic/Pro) — 3 événements gérés :
//   - checkout.session.completed (mode subscription) : première activation, applique le plan
//     et les crédits directement au compte connecté (client_reference_id).
//   - invoice.paid (billing_reason = subscription_cycle) : renouvellement automatique tous les
//     3 mois, remet les crédits au plein montant du plan.
//   - customer.subscription.deleted : l'abonnement est résilié, on détache juste l'ID côté compte.
// Chaque handler est idempotent par stripeEvent.id (processed_stripe_events, contrat) — Stripe
// réessaie parfois le même événement. Toute erreur inattendue → 500 pour que Stripe réessaie.

const Stripe = require('stripe');
const { HttpError, preflight, json, header, handleError } = require('./_lib/http');
const { rpc } = require('./_lib/supabase');
const { sendEmail, subscriptionActivatedEmail, subscriptionRenewedEmail } = require('./_lib/email');
const { SUBSCRIPTION_PLANS, SUBSCRIPTION_DURATION_DAYS } = require('./_lib/codes');
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

function planExpiryIso() {
  return new Date(Date.now() + SUBSCRIPTION_DURATION_DAYS * 24 * 3600 * 1000).toISOString();
}

// Best-effort : ne doit jamais faire échouer la réponse au webhook.
async function reportPurchase({ email, amountCents, currency, eventId }) {
  try {
    await sendPurchaseEvent({
      email,
      value: (amountCents ?? 0) / 100,
      currency: (currency || 'usd').toUpperCase(),
      eventId,
    });
  } catch (err) {
    console.error('[stripe-webhook] sendPurchaseEvent a levé :', err && err.message);
  }
}

async function handleCheckoutCompleted(stripeEvent) {
  const session = stripeEvent.data.object;
  if (session.mode !== 'subscription' || session.payment_status !== 'paid') return;

  const plan = session.metadata && session.metadata.plan;
  if (!SUBSCRIPTION_PLANS[plan]) {
    console.error(`[stripe-webhook] Plan inconnu pour la session ${session.id}.`);
    return;
  }

  const userId = session.client_reference_id;
  if (!userId) {
    console.error(`[stripe-webhook] Session ${session.id} sans client_reference_id.`);
    return;
  }

  const applied = await rpc('activate_subscription', {
    p_stripe_event_id: stripeEvent.id,
    p_user_id: userId,
    p_plan: plan,
    p_credits: SUBSCRIPTION_PLANS[plan].credits,
    p_stripe_customer_id: session.customer,
    p_stripe_subscription_id: session.subscription,
    p_plan_expires_at: planExpiryIso(),
  });
  if (!applied) return; // déjà traité (idempotence)

  const email = (session.customer_details && session.customer_details.email) || session.customer_email || null;
  await reportPurchase({ email, amountCents: session.amount_total, currency: session.currency, eventId: stripeEvent.id });

  if (email) {
    const { sent } = await sendEmail({
      to: email,
      ...subscriptionActivatedEmail({ plan, credits: SUBSCRIPTION_PLANS[plan].credits }),
    });
    if (!sent) console.error(`[stripe-webhook] Courriel d'activation non envoyé pour ${session.id}.`);
  }
}

async function handleInvoicePaid(stripeEvent) {
  const invoice = stripeEvent.data.object;
  // Le premier paiement (subscription_create) est déjà traité par checkout.session.completed —
  // ne traiter ici QUE les renouvellements pour ne pas doubler les crédits à l'activation.
  if (invoice.billing_reason !== 'subscription_cycle') return;

  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const plan = subscription.metadata && subscription.metadata.plan;
  if (!SUBSCRIPTION_PLANS[plan]) {
    console.error(`[stripe-webhook] Renouvellement : plan inconnu pour l'abonnement ${subscriptionId}.`);
    return;
  }

  const renewed = await rpc('renew_subscription_credits', {
    p_stripe_event_id: stripeEvent.id,
    p_stripe_subscription_id: subscriptionId,
    p_credits: SUBSCRIPTION_PLANS[plan].credits,
    p_plan_expires_at: planExpiryIso(),
  });
  if (!renewed) return; // déjà traité, ou abonnement inconnu côté RPVD

  const email = invoice.customer_email || null;
  await reportPurchase({ email, amountCents: invoice.amount_paid, currency: invoice.currency, eventId: stripeEvent.id });

  if (email) {
    const { sent } = await sendEmail({
      to: email,
      ...subscriptionRenewedEmail({ plan, credits: SUBSCRIPTION_PLANS[plan].credits }),
    });
    if (!sent) console.error(`[stripe-webhook] Courriel de renouvellement non envoyé pour ${subscriptionId}.`);
  }
}

async function handleSubscriptionDeleted(stripeEvent) {
  const subscription = stripeEvent.data.object;
  await rpc('cancel_subscription', {
    p_stripe_event_id: stripeEvent.id,
    p_stripe_subscription_id: subscription.id,
  });
}

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;

  try {
    const stripeEvent = verifyEvent(event);

    if (stripeEvent.type === 'checkout.session.completed') {
      await handleCheckoutCompleted(stripeEvent);
    } else if (stripeEvent.type === 'invoice.paid') {
      await handleInvoicePaid(stripeEvent);
    } else if (stripeEvent.type === 'customer.subscription.deleted') {
      await handleSubscriptionDeleted(stripeEvent);
    }

    return json(200, { received: true });
  } catch (err) {
    return handleError(err, 'stripe-webhook');
  }
};
