'use strict';
// POST /.netlify/functions/create-portal-session
// Contrat pricing v3 : un abonnement récurrent DOIT pouvoir être annulé aussi facilement qu'il a
// été souscrit (honnêteté commerciale, même principe que le refus des dark patterns sur le
// paywall) — ouvre le Stripe Customer Portal pour le client connecté.

const Stripe = require('stripe');
const { HttpError, preflight, json, handleError } = require('./_lib/http');
const { getServiceClient, getUserFromRequest } = require('./_lib/supabase');

let stripeClient = null;
function getStripe() {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY manquante');
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

function siteUrl() {
  const url = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:8888';
  return url.replace(/\/+$/, '');
}

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;

  try {
    const user = await getUserFromRequest(event);
    if (!user) throw new HttpError(401, 'UNAUTHORIZED');

    const { data: profile, error } = await getServiceClient()
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (!profile || !profile.stripe_customer_id) {
      throw new HttpError(404, 'NOT_FOUND', 'Aucun abonnement actif pour ce compte.');
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${siteUrl()}/`,
    });

    return json(200, { url: session.url });
  } catch (err) {
    return handleError(err, 'create-portal-session');
  }
};
