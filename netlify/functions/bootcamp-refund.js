'use strict';
// POST /.netlify/functions/bootcamp-refund
//   { "action": "info",   "token": "…" } → état du billet (page /rembourser)
//   { "action": "refund", "token": "…" } → remboursement intégral si demandé avant samedi 23 h 59
// Le jeton (aléatoire, envoyé dans le courriel de confirmation) est la seule preuve requise.

const { HttpError, preflight, parseBody, json, getIp, sha256, handleError } = require('./_lib/http');
const { getServiceClient } = require('./_lib/supabase');
const { assertRateLimit } = require('./_lib/ratelimit');
const { getStripe } = require('./_lib/stripe-client');
const { sendEmail, bootcampRefundEmail } = require('./_lib/email');
const zoom = require('./_lib/zoom');
const B = require('./_lib/bootcamp');

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;

  try {
    const body = parseBody(event);
    const token = String(body.token || '');
    if (!/^[0-9a-f]{36}$/.test(token)) throw new HttpError(400, 'BAD_REQUEST', 'Lien invalide.');
    await assertRateLimit(`bootcamp-refund:ip:${sha256(getIp(event))}`, 20, 3600);

    const db = getServiceClient();
    const { data: ticket, error } = await db
      .from('bootcamp_tickets')
      .select('*, session:bootcamp_sessions(*)')
      .eq('refund_token', token)
      .maybeSingle();
    if (error) throw error;
    if (!ticket || !ticket.session) throw new HttpError(404, 'BAD_REQUEST', 'Réservation introuvable.');

    const session = ticket.session;
    const now = new Date();
    const info = {
      topic: session.topic,
      level: session.level,
      subject: session.subject,
      when: B.formatWhen(session.starts_at),
      price: B.formatPrice(ticket.amount_cents || session.price_cents),
      status: ticket.status,
      refund_deadline: B.formatDeadline(session.week_key),
      refundable: B.refundable(ticket, session, now),
    };

    if (body.action === 'info') return json(200, { ok: true, ticket: info });
    if (body.action !== 'refund') throw new HttpError(400, 'BAD_REQUEST', 'action inconnue.');

    if (!info.refundable) {
      throw new HttpError(409, 'BAD_REQUEST', ticket.status === 'refunded' ? 'Ce billet est déjà remboursé.' : `Le délai de remboursement est passé (${info.refund_deadline}).`);
    }

    // Verrou : un seul remboursement possible même en cas de double clic.
    const { data: locked } = await db
      .from('bootcamp_tickets')
      .update({ status: 'refunded', refunded_at: now.toISOString() })
      .eq('id', ticket.id)
      .eq('status', 'paid')
      .select('id');
    if (!locked || locked.length === 0) throw new HttpError(409, 'BAD_REQUEST', 'Ce billet est déjà remboursé.');

    try {
      await getStripe().refunds.create(
        { payment_intent: ticket.stripe_payment_intent, reason: 'requested_by_customer', metadata: { kind: 'bootcamp', ticket_id: ticket.id } },
        { idempotencyKey: `bootcamp-refund-${ticket.id}` },
      );
    } catch (err) {
      await db.from('bootcamp_tickets').update({ status: 'paid', refunded_at: null }).eq('id', ticket.id);
      console.error('[bootcamp-refund] Stripe :', err.message);
      throw new HttpError(502, 'SERVER_ERROR', 'Le remboursement a échoué. Réessaie dans un instant.');
    }

    if (session.zoom_meeting_id && ticket.zoom_registrant_id && zoom.zoomConfigured()) {
      await zoom.cancelRegistrant(session.zoom_meeting_id, ticket.zoom_registrant_id).catch((e) => console.error('[bootcamp-refund] Zoom :', e.message));
    }
    if (ticket.email) await sendEmail({ to: ticket.email, ...bootcampRefundEmail({ topic: info.topic, when: info.when, price: info.price }) });

    return json(200, { ok: true, ticket: { ...info, status: 'refunded', refundable: false } });
  } catch (err) {
    return handleError(err, 'bootcamp-refund');
  }
};
