'use strict';
// POST /.netlify/functions/bootcamp-checkout  { session_id, email?, accept_policy, adult_or_guardian, source? }
// Réserve une place (billet « pending » retenu 35 min) puis ouvre Stripe Checkout en paiement
// unique : 20,00 $ CAD, montant final (rien n'est ajouté au paiement). Le webhook Stripe
// confirme le billet, inscrit l'élève à la réunion Zoom et envoie la confirmation.

const { HttpError, preflight, parseBody, json, getIp, sha256, handleError } = require('./_lib/http');
const { getServiceClient } = require('./_lib/supabase');
const { assertRateLimit } = require('./_lib/ratelimit');
const { getStripe } = require('./_lib/stripe-client');
const B = require('./_lib/bootcamp');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Valeurs des cookies Meta (_fbp / _fbc) : ex. fb.1.1696000000000.1234567890
const FB_COOKIE = /^fb\.[0-9]\.[0-9]{10,13}\.[A-Za-z0-9_-]{1,200}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;

  try {
    const body = parseBody(event);
    const sessionId = String(body.session_id || '');
    if (!UUID.test(sessionId)) throw new HttpError(400, 'BAD_REQUEST', 'Session inconnue.');
    if (body.accept_policy !== true || body.adult_or_guardian !== true) {
      throw new HttpError(400, 'BAD_REQUEST', 'Coche les deux cases pour continuer.');
    }
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : '';
    if (email && !EMAIL_PATTERN.test(email)) throw new HttpError(400, 'BAD_REQUEST', 'Courriel invalide.');

    await assertRateLimit(`bootcamp-checkout:ip:${sha256(getIp(event))}`, 12, 3600);

    const db = getServiceClient();
    const { data: session, error } = await db.from('bootcamp_sessions').select('*').eq('id', sessionId).maybeSingle();
    if (error) throw error;
    if (!session) throw new HttpError(404, 'BAD_REQUEST', 'Session introuvable.');

    const now = new Date();
    const stats = await B.ticketStats(db, [session], now);
    const avail = B.availability(session, stats[session.id], now);
    if (avail.seats_left <= 0) {
      const msg = {
        full: 'Cette session est complète.',
        paused: 'Les ventes sont fermées. Si des places se libèrent, elles rouvrent dimanche à 8 h.',
        closed: 'Les réservations pour cette session sont fermées.',
        cancelled: 'Cette session est annulée.',
      };
      throw new HttpError(409, 'BAD_REQUEST', msg[avail.state] || 'Plus de place disponible.');
    }

    const ticketId = require('crypto').randomUUID();
    const { error: insertError } = await db.from('bootcamp_tickets').insert({
      id: ticketId,
      session_id: session.id,
      status: 'pending',
      email: email || null,
      refund_token: B.newToken(),
      source: typeof body.source === 'string' ? body.source.slice(0, 60) : null,
    });
    if (insertError) throw insertError;

    const base = B.siteUrl();
    const when = B.formatWhen(session.starts_at);
    const metadata = { kind: 'bootcamp', session_id: session.id, ticket_id: ticketId };
    // Mesure publicitaire : uniquement si le visiteur a accepté les cookies marketing (case du
    // bandeau). Sans ce `mc`, le webhook n'envoie RIEN à Meta.
    if (body.marketing_consent === true) {
      metadata.mc = '1';
      if (FB_COOKIE.test(String(body.fbp || ''))) metadata.fbp = String(body.fbp);
      if (FB_COOKIE.test(String(body.fbc || ''))) metadata.fbc = String(body.fbc);
    }
    let checkout;
    try {
      checkout = await getStripe().checkout.sessions.create({
        mode: 'payment',
        locale: 'fr-CA',
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: B.CURRENCY,
              unit_amount: session.price_cents,
              product_data: {
                name: `Bootcamp RPVD — ${session.topic}`,
                description: `${session.level} · ${session.subject} · ${when} · 1 h 30 en direct sur Zoom`,
              },
            },
          },
        ],
        ...(email ? { customer_email: email } : {}),
        metadata,
        payment_intent_data: { metadata, description: `Bootcamp RPVD — ${session.topic} (${when})` },
        success_url: `${base}/merci?s=${session.id}`,
        cancel_url: `${base}/reserver?s=${session.id}&annule=1`,
        expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
        // Même réglage que create-checkout.js (Managed Payments désactivé pour ne pas exiger de
        // code de taxe sur un produit créé à la volée).
        managed_payments: { enabled: false },
      });
    } catch (err) {
      await db.from('bootcamp_tickets').update({ status: 'expired' }).eq('id', ticketId);
      throw err;
    }

    await db.from('bootcamp_tickets').update({ stripe_checkout_id: checkout.id }).eq('id', ticketId);
    return json(200, { url: checkout.url });
  } catch (err) {
    return handleError(err, 'bootcamp-checkout');
  }
};
