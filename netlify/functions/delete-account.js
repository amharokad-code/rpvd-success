'use strict';
// POST /.netlify/functions/delete-account
// Suppression de compte in-app (exigée par Apple App Store Review 5.1.1(v) et Google Play pour
// toute app qui permet de créer un compte). Supprime l'utilisateur d'auth Supabase : les lignes
// `users`, `submissions`, `simulations` et `push_tokens` partent en cascade (ON DELETE CASCADE).
// Les codes d'activation consommés passent à used_by = NULL (ON DELETE SET NULL, trace d'audit
// anonymisée). Un abonnement Stripe éventuel est résilié au mieux ; un abonnement App Store /
// Google Play ne peut être annulé que par l'utilisateur dans les réglages du store (l'app le dit).

const Stripe = require('stripe');
const { HttpError, preflight, json, handleError } = require('./_lib/http');
const { getServiceClient, getUserFromRequest } = require('./_lib/supabase');
const { assertRateLimit } = require('./_lib/ratelimit');

const DELETE_LIMIT = 3;
const DELETE_WINDOW_SECONDS = 3600;

async function cancelStripeSubscription(subscriptionId) {
  if (!subscriptionId || !process.env.STRIPE_SECRET_KEY) return;
  try {
    await new Stripe(process.env.STRIPE_SECRET_KEY).subscriptions.cancel(subscriptionId);
  } catch (err) {
    // Déjà résilié ou introuvable : la suppression du compte ne doit pas échouer pour autant.
    console.error('[delete-account] Résiliation Stripe impossible :', err && err.message);
  }
}

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;

  try {
    const user = await getUserFromRequest(event);
    if (!user) throw new HttpError(401, 'UNAUTHORIZED');

    await assertRateLimit(`delete-account:user:${user.id}`, DELETE_LIMIT, DELETE_WINDOW_SECONDS);

    const db = getServiceClient();
    const { data: profile } = await db.from('users').select('stripe_subscription_id').eq('id', user.id).maybeSingle();
    await cancelStripeSubscription(profile && profile.stripe_subscription_id);

    const { error } = await db.auth.admin.deleteUser(user.id);
    if (error) throw error;

    return json(200, { ok: true });
  } catch (err) {
    return handleError(err, 'delete-account');
  }
};
