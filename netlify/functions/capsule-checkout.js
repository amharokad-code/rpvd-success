'use strict';
// POST { kind: 'capsule', slug } ou { kind: 'bootcamp', id } → { url } Stripe Checkout (CAD, paiement unique).
// Aucun prix barré ni compte à rebours : le prix affiché est le prix facturé.

const { HttpError, preflight, parseBody, json, handleError } = require('./_lib/http');
const { getServiceClient } = require('./_lib/supabase');
const { getStripe } = require('./_lib/stripe-client');
const { siteUrl } = require('./_lib/legal');
const { clean, UUID } = require('./_lib/capsules');

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;
  try {
    const body = parseBody(event);
    const db = getServiceClient();
    const metadata = { kind: 'capsule_order' };
    let item;

    if (body.kind === 'bootcamp') {
      if (!UUID.test(String(body.id || ''))) throw new HttpError(400, 'BAD_REQUEST', 'Bootcamp inconnu.');
      const { data: bc, error } = await db.from('bootcamps').select('*').eq('id', body.id).maybeSingle();
      if (error) throw error;
      if (!bc || new Date(bc.starts_at) < new Date()) throw new HttpError(404, 'BAD_REQUEST', 'Bootcamp introuvable.');
      const { count } = await db.from('orders').select('id', { count: 'exact', head: true }).eq('bootcamp_id', bc.id);
      if ((count || 0) >= bc.capacity) throw new HttpError(409, 'BAD_REQUEST', 'Ce bootcamp est complet.');
      item = { name: `Bootcamp RPVD : ${bc.title}`, amount: bc.price_cad };
      metadata.product_type = 'bootcamp';
      metadata.bootcamp_id = bc.id;
    } else {
      const slug = clean(body.slug, 80);
      const { data: cap, error } = await db.from('capsules').select('*').eq('slug', slug).eq('published', true).maybeSingle();
      if (error) throw error;
      if (!cap) throw new HttpError(404, 'BAD_REQUEST', 'Capsule introuvable.');
      item = { name: `Capsule RPVD : ${cap.title}`, amount: cap.price_cad };
      metadata.product_type = cap.type;
      metadata.capsule_id = cap.id;
      metadata.slug = cap.slug;
    }
    // Case facultative, non pré-cochée : mesure publicitaire (voir ad-conversions.consentGranted).
    if (body.marketing_consent === true) metadata.mk = '1';

    const base = siteUrl();
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [{ quantity: 1, price_data: { currency: 'cad', unit_amount: item.amount, product_data: { name: item.name } } }],
      metadata,
      payment_intent_data: { metadata },
      success_url: `${base}/merci-capsule`,
      cancel_url: `${base}/`,
    });
    if (!session || !session.url) throw new Error('Session Stripe sans URL');
    return json(200, { url: session.url });
  } catch (err) {
    return handleError(err, 'capsule-checkout');
  }
};
