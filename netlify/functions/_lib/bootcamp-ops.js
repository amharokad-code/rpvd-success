'use strict';
// Opérations du Bootcamp qui touchent Stripe, Zoom et les courriels : confirmation d'un
// paiement, inscription Zoom, envoi des liens, places libérées, suivi, annulation.
// Utilisé par le webhook Stripe, l'admin et la tâche planifiée (bootcamp-cron).

const { getStripe } = require('./stripe-client');
const zoom = require('./zoom');
const {
  sendEmail,
  sendBatch,
  bootcampTicketEmail,
  bootcampZoomLinkEmail,
  bootcampCancelledEmail,
  bootcampFreedSeatsEmail,
  bootcampFollowupEmail,
} = require('./email');
const B = require('./bootcamp');

// Inscrit un billet payé à la réunion Zoom → lien personnel (un appareil à la fois).
async function registerZoom(db, ticket, session) {
  if (ticket.zoom_join_url || !session.zoom_meeting_id || !ticket.email || !zoom.zoomConfigured()) return ticket;
  try {
    const first = (ticket.buyer_name || '').split(/\s+/)[0] || ticket.email.split('@')[0];
    const { registrantId, joinUrl } = await zoom.addRegistrant(session.zoom_meeting_id, { email: ticket.email, firstName: first });
    const { data } = await db
      .from('bootcamp_tickets')
      .update({ zoom_registrant_id: registrantId, zoom_join_url: joinUrl })
      .eq('id', ticket.id)
      .select('*')
      .single();
    return data || ticket;
  } catch (err) {
    console.error('[bootcamp] Inscription Zoom impossible :', err.message);
    return ticket;
  }
}

// checkout.session.completed (metadata.kind = 'bootcamp'). Idempotent : un billet déjà payé
// n'est jamais retraité (Stripe réessaie parfois le même événement).
async function confirmPaidCheckout(db, checkout) {
  if (checkout.payment_status !== 'paid') return { skipped: 'not_paid' };
  const ticketId = checkout.metadata && checkout.metadata.ticket_id;
  if (!ticketId) return { skipped: 'no_ticket' };

  const email = ((checkout.customer_details && checkout.customer_details.email) || checkout.customer_email || '').toLowerCase() || null;
  const name = (checkout.customer_details && checkout.customer_details.name) || null;
  const { data: updated, error } = await db
    .from('bootcamp_tickets')
    .update({
      status: 'paid',
      email,
      buyer_name: name,
      amount_cents: checkout.amount_total,
      stripe_checkout_id: checkout.id,
      stripe_payment_intent: typeof checkout.payment_intent === 'string' ? checkout.payment_intent : checkout.payment_intent && checkout.payment_intent.id,
      paid_at: new Date().toISOString(),
    })
    .eq('id', ticketId)
    .in('status', ['pending', 'expired'])
    .select('*, session:bootcamp_sessions(*)');
  if (error) throw error;
  if (!updated || updated.length === 0) return { skipped: 'already_processed' };

  let ticket = updated[0];
  const session = ticket.session;
  ticket = await registerZoom(db, ticket, session);

  await db
    .from('analytics_events')
    .insert({ event_type: 'checkout_completed', plan: 'bootcamp', path: '/reserver' })
    .then(() => {}, (e) => console.error('[analytics]', e.message));

  if (email) {
    const { sent } = await sendEmail({
      to: email,
      ...bootcampTicketEmail({
        topic: session.topic,
        level: session.level,
        subject: session.subject,
        when: B.formatWhen(session.starts_at),
        price: B.formatPrice(checkout.amount_total),
        refundDeadline: B.formatDeadline(session.week_key),
        refundUrl: `${B.siteUrl()}/rembourser?t=${ticket.refund_token}`,
        reference: ticket.id.slice(0, 8).toUpperCase(),
      }),
    });
    if (!sent) console.error(`[bootcamp] Confirmation non envoyée pour le billet ${ticket.id}.`);
  }
  return { ok: true, ticket_id: ticket.id };
}

// Envoie le lien Zoom (personnel si l'API Zoom est configurée, sinon le lien collé dans
// l'admin) à chaque billet payé qui ne l'a pas encore reçu.
async function sendLinks(db, session) {
  const { data: tickets, error } = await db
    .from('bootcamp_tickets')
    .select('*')
    .eq('session_id', session.id)
    .eq('status', 'paid')
    .is('link_sent_at', null);
  if (error) throw error;
  const ready = [];
  for (let t of tickets || []) {
    t = await registerZoom(db, t, session);
    const url = t.zoom_join_url || session.manual_join_url || session.zoom_join_url;
    if (t.email && url) ready.push({ ticket: t, url, personal: Boolean(t.zoom_join_url) });
  }
  if (ready.length === 0) return { sent: 0, waiting: (tickets || []).length };
  const when = B.formatWhen(session.starts_at);
  const results = await sendBatch(
    ready.map(({ ticket, url, personal }) => ({ to: ticket.email, ...bootcampZoomLinkEmail({ topic: session.topic, when, joinUrl: url, personal }) })),
  );
  const ids = ready.filter((_, i) => results[i]).map((r) => r.ticket.id);
  if (ids.length) await db.from('bootcamp_tickets').update({ link_sent_at: new Date().toISOString() }).in('id', ids);
  return { sent: ids.length, failed: ready.length - ids.length, waiting: (tickets || []).length - ready.length };
}

// Dimanche 8 h : places réellement libérées → courriel aux votants de ce sujet sans billet.
async function notifyFreedSeats(db, session, seats) {
  const { data: voters } = await db
    .from('bootcamp_votes')
    .select('email')
    .eq('week_key', session.week_key)
    .eq('level', session.level)
    .eq('subject', session.subject)
    .eq('topic', session.topic);
  const { data: buyers } = await db.from('bootcamp_tickets').select('email').eq('session_id', session.id).eq('status', 'paid');
  const bought = new Set((buyers || []).map((b) => b.email));
  const targets = [...new Set((voters || []).map((v) => v.email))].filter((e) => !bought.has(e));
  const markDone = () => db.from('bootcamp_sessions').update({ freed_notice_sent_at: new Date().toISOString() }).eq('id', session.id);
  if (targets.length === 0) {
    await markDone();
    return { sent: 0 };
  }
  const when = B.formatWhen(session.starts_at);
  const url = `${B.siteUrl()}/reserver?s=${session.id}`;
  const results = await sendBatch(targets.map((to) => ({ to, ...bootcampFreedSeatsEmail({ topic: session.topic, when, seats, url }) })));
  const sent = results.filter(Boolean).length;
  if (sent > 0) await markDone(); // sinon la prochaine exécution réessaie
  return { sent };
}

// Lendemain 9 h : merci + passerelle vers l'outil d'analyse.
async function sendFollowups(db, session) {
  const { data: tickets } = await db
    .from('bootcamp_tickets')
    .select('id, email')
    .eq('session_id', session.id)
    .eq('status', 'paid')
    .is('followup_sent_at', null);
  const list = (tickets || []).filter((t) => t.email);
  if (list.length === 0) return { sent: 0 };
  const results = await sendBatch(
    list.map((t) => ({
      to: t.email,
      ...bootcampFollowupEmail({ topic: session.topic, appUrl: `${B.siteUrl()}/app?src=bootcamp`, voteUrl: `${B.siteUrl()}/vote` }),
    })),
  );
  const ids = list.filter((_, i) => results[i]).map((t) => t.id);
  if (ids.length) await db.from('bootcamp_tickets').update({ followup_sent_at: new Date().toISOString() }).in('id', ids);
  return { sent: ids.length };
}

// Annulation par RPVD : remboursement intégral automatique de chaque billet payé + courriel.
async function cancelSession(db, session) {
  await db.from('bootcamp_sessions').update({ status: 'cancelled' }).eq('id', session.id);
  const { data: tickets } = await db.from('bootcamp_tickets').select('*').eq('session_id', session.id).eq('status', 'paid');
  let refunded = 0;
  let failed = 0;
  const when = B.formatWhen(session.starts_at);
  for (const t of tickets || []) {
    try {
      await getStripe().refunds.create(
        { payment_intent: t.stripe_payment_intent, metadata: { kind: 'bootcamp', ticket_id: t.id, reason: 'session_cancelled' } },
        { idempotencyKey: `bootcamp-refund-${t.id}` },
      );
      await db.from('bootcamp_tickets').update({ status: 'refunded', refunded_at: new Date().toISOString() }).eq('id', t.id);
      refunded += 1;
      if (t.email) await sendEmail({ to: t.email, ...bootcampCancelledEmail({ topic: session.topic, when, price: B.formatPrice(t.amount_cents) }) });
    } catch (err) {
      failed += 1;
      console.error(`[bootcamp] Remboursement impossible (billet ${t.id}) :`, err.message);
    }
  }
  if (session.zoom_meeting_id && zoom.zoomConfigured()) {
    await zoom.deleteMeeting(session.zoom_meeting_id).catch((e) => console.error('[bootcamp] Zoom :', e.message));
  }
  return { refunded, failed };
}

module.exports = { registerZoom, confirmPaidCheckout, sendLinks, notifyFreedSeats, sendFollowups, cancelSession };
