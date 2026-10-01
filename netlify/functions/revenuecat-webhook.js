'use strict';
// POST /.netlify/functions/revenuecat-webhook
// Achats in-app (App Store / Google Play) via RevenueCat — l'équivalent mobile de stripe-webhook.js.
// Source de vérité = le SERVEUR : l'app ne crédite jamais rien elle-même ; elle interroge le profil
// après l'achat. Les abonnements Basic/Pro RevenueCat accordent exactement le même plan et les mêmes
// crédits que Stripe (SUBSCRIPTION_PLANS), via la même RPC activate_subscription.
//
// Configuration RevenueCat : Project settings > Integrations > Webhooks
//   URL            : https://<ton-site>.netlify.app/.netlify/functions/revenuecat-webhook
//   Authorization  : une valeur secrète au choix, copiée dans REVENUECAT_WEBHOOK_AUTH (Netlify).
// L'identifiant app_user_id de RevenueCat DOIT être l'id Supabase de l'utilisateur (l'app fait
// Purchases.configure({ appUserID }) / logIn avec cet id).
//
// Événements : INITIAL_PURCHASE / RENEWAL / PRODUCT_CHANGE / UNCANCELLATION → active (crédits remis
// au plein montant du plan, validité prolongée) ; EXPIRATION → plan repasse à « free » (les crédits
// restants restent utilisables, comme à la résiliation Stripe) ; le reste est ignoré (200).

const crypto = require('crypto');
const { HttpError, preflight, header, parseBody, json, handleError } = require('./_lib/http');
const { getServiceClient, rpc } = require('./_lib/supabase');
const { SUBSCRIPTION_PLANS, SUBSCRIPTION_DURATION_DAYS } = require('./_lib/codes');
const { sendEmail, subscriptionActivatedEmail } = require('./_lib/email');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIVATING_EVENTS = ['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION'];

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

// Même logique de détection que l'app (apps/mobile/src/config.ts : PLAN_KEYWORDS).
function planFromProduct(productId) {
  const id = String(productId || '');
  if (/(^|[_:.-])pro([_:.-]|$)/i.test(id)) return 'pro';
  if (/basic/i.test(id)) return 'basic';
  return null;
}

function resolveUserId(event) {
  const candidates = [event.app_user_id, event.original_app_user_id].concat(Array.isArray(event.aliases) ? event.aliases : []);
  return candidates.find((value) => typeof value === 'string' && UUID_PATTERN.test(value)) || null;
}

function expiryIso(event) {
  const ms = Number(event.expiration_at_ms);
  if (Number.isFinite(ms) && ms > Date.now()) return new Date(ms).toISOString();
  return new Date(Date.now() + SUBSCRIPTION_DURATION_DAYS * 24 * 3600 * 1000).toISOString();
}

async function activate(event, userId) {
  const plan = planFromProduct(event.new_product_id || event.product_id);
  if (!plan || !SUBSCRIPTION_PLANS[plan]) {
    console.error(`[revenuecat-webhook] Produit inconnu : ${event.product_id}`);
    return;
  }

  const db = getServiceClient();
  // activate_subscription écrase les identifiants Stripe : on repasse ceux déjà présents pour ne pas
  // détacher un abonnement Stripe existant (cas rare d'un compte avec les deux).
  const { data: existing } = await db
    .from('users')
    .select('stripe_customer_id, stripe_subscription_id, email')
    .eq('id', userId)
    .maybeSingle();

  const applied = await rpc('activate_subscription', {
    p_stripe_event_id: `rc_${event.id}`,
    p_user_id: userId,
    p_plan: plan,
    p_credits: SUBSCRIPTION_PLANS[plan].credits,
    p_stripe_customer_id: (existing && existing.stripe_customer_id) || null,
    p_stripe_subscription_id: (existing && existing.stripe_subscription_id) || null,
    p_plan_expires_at: expiryIso(event),
  });
  if (!applied) return; // déjà traité (idempotence, RevenueCat peut renvoyer un événement)

  if (event.type === 'INITIAL_PURCHASE') {
    await db
      .from('analytics_events')
      .insert({ event_type: 'checkout_completed', plan, path: `/m/${event.store || 'store'}` })
      .then(() => {}, (e) => console.error('[analytics]', e.message));

    const email = existing && existing.email;
    if (email) {
      const { sent } = await sendEmail({
        to: email,
        ...subscriptionActivatedEmail({ plan, credits: SUBSCRIPTION_PLANS[plan].credits }),
      });
      if (!sent) console.error(`[revenuecat-webhook] Courriel d'activation non envoyé (${event.id}).`);
    }
  }
}

async function expire(event, userId) {
  const db = getServiceClient();
  // Idempotence : un seul traitement par événement RevenueCat.
  const { data: inserted, error: insertError } = await db
    .from('processed_stripe_events')
    .upsert({ stripe_event_id: `rc_${event.id}`, kind: 'rc_expiration' }, { onConflict: 'stripe_event_id', ignoreDuplicates: true })
    .select('stripe_event_id');
  if (insertError) throw insertError;
  if (!inserted || inserted.length === 0) return;

  // Ne touche jamais un compte dont l'abonnement est géré par Stripe.
  const { error } = await db
    .from('users')
    .update({ plan: 'free', plan_expires_at: new Date().toISOString() })
    .eq('id', userId)
    .is('stripe_subscription_id', null)
    .in('plan', ['basic', 'pro']);
  if (error) throw error;
}

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;

  try {
    const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
    if (!expected) throw new Error('REVENUECAT_WEBHOOK_AUTH manquante');
    if (!safeEqual(header(event, 'authorization'), expected)) throw new HttpError(401, 'UNAUTHORIZED');

    const body = parseBody(event);
    const rcEvent = body && body.event;
    if (!rcEvent || typeof rcEvent !== 'object' || !rcEvent.id || !rcEvent.type) {
      throw new HttpError(400, 'BAD_REQUEST', 'Événement RevenueCat invalide.');
    }

    if (rcEvent.type === 'TEST') return json(200, { received: true, test: true });

    const userId = resolveUserId(rcEvent);
    if (!userId) {
      // Achat anonyme ($RCAnonymousID) : impossible à rattacher à un compte, on l'ignore sans erreur.
      console.error(`[revenuecat-webhook] app_user_id non rattachable (${rcEvent.type}).`);
      return json(200, { received: true, ignored: 'anonymous' });
    }

    if (ACTIVATING_EVENTS.includes(rcEvent.type)) await activate(rcEvent, userId);
    else if (rcEvent.type === 'EXPIRATION') await expire(rcEvent, userId);

    return json(200, { received: true });
  } catch (err) {
    return handleError(err, 'revenuecat-webhook');
  }
};
