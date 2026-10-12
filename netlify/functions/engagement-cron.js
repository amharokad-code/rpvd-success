'use strict';
// Fonction planifiée (1x/jour) : courriels de suivi au PARENT (J+1 non commencé, progression, J-3, fin,
// invitation Bootcamp à J-5 sous 50 %). Envoi seulement si consentement_courriels = true, courriel non
// désabonné (email_optouts) et achat actif. Chaque courriel porte l'identité, l'adresse postale et un
// lien de désabonnement fonctionnel (LCAP). engagement_events (clé primaire) empêche tout doublon.

const { json, handleError } = require('./_lib/http');
const { getServiceClient } = require('./_lib/supabase');
const { sendEmail, engagementEmail } = require('./_lib/email');
const { daysUntil } = require('./_lib/capsules');
const { summarize, nextEngagementEmail, planSuggere } = require('./_lib/engagement');
const { siteUrl, unsubscribeHeaders } = require('./_lib/legal');

const DAY_MS = 24 * 3600 * 1000;

async function run(db, now = new Date()) {
  const { data: orders, error } = await db
    .from('orders')
    .select('id,email,created_at,capsule_id,capsules(id,slug,title,date_examen)')
    .eq('status', 'active')
    .eq('consentement_courriels', true)
    .not('parent_attested_at', 'is', null)
    .not('capsule_id', 'is', null)
    .limit(2000);
  if (error) throw error;
  const { data: optouts } = await db.from('email_optouts').select('email');
  const out = new Set((optouts || []).map((o) => o.email));
  const { count: upcoming } = await db.from('bootcamps').select('id', { count: 'exact', head: true }).gte('starts_at', now.toISOString());

  const stats = { sent: 0, skipped: 0, failed: 0 };
  for (const order of orders || []) {
    if (!order.capsules || out.has(order.email)) { stats.skipped += 1; continue; }
    const { data: segs } = await db.from('capsule_segments').select('id,ordre').eq('capsule_id', order.capsules.id).order('ordre');
    if (!segs || segs.length === 0) { stats.skipped += 1; continue; }
    const { data: prog } = await db.from('watch_progress').select('*').eq('order_id', order.id);
    const { data: events } = await db.from('engagement_events').select('kind,ref,sent_at').eq('order_id', order.id);
    const summary = summarize(segs, prog || []);
    const progressEvents = (events || []).filter((e) => e.kind === 'progress').sort((a, b) => b.sent_at.localeCompare(a.sent_at));

    const decision = nextEngagementEmail({
      summary,
      hoursSincePurchase: (now - new Date(order.created_at)) / 3600000,
      daysToExam: order.capsules.date_examen ? daysUntil(order.capsules.date_examen, now) : null,
      sentKinds: new Set((events || []).filter((e) => e.kind !== 'progress').map((e) => e.kind)),
      lastProgressRef: progressEvents.length ? progressEvents[0].ref : '',
      lastProgressAgoDays: progressEvents.length ? (now - new Date(progressEvents[0].sent_at)) / DAY_MS : 99,
      hasUpcomingBootcamp: (upcoming || 0) > 0,
    });
    if (!decision) { stats.skipped += 1; continue; }

    // Réserver d'abord (clé primaire) : aucun doublon, même si deux exécutions se chevauchent.
    const { error: lockError } = await db.from('engagement_events').insert({ order_id: order.id, kind: decision.kind, ref: decision.ref });
    if (lockError) { stats.skipped += 1; continue; }

    const base = siteUrl();
    const q = `o=${encodeURIComponent(order.id)}`;
    const links = { page: `${base}/desabonner?${q}`, oneClick: `${base}/.netlify/functions/capsule-unsubscribe?${q}`, label: 'Ne plus recevoir ces courriels' };
    const remaining = segs.filter((s) => !(prog || []).some((p) => p.segment_id === s.id && p.complete)).map((s) => s.ordre);
    const toExam = order.capsules.date_examen ? daysUntil(order.capsules.date_examen, now) : null;
    const message = engagementEmail(decision.kind, {
      title: order.capsules.title,
      completed: summary.completed,
      total: summary.total,
      url: `${base}/suivi`,
      bootcampUrl: `${base}/#produits`,
      plan: planSuggere(remaining, toExam),
      examDate: order.capsules.date_examen,
      unsubscribe: links,
    });
    const { sent } = await sendEmail({ to: order.email, ...message, headers: unsubscribeHeaders(links) });
    if (sent) stats.sent += 1;
    else {
      stats.failed += 1;
      await db.from('engagement_events').delete().eq('order_id', order.id).eq('kind', decision.kind).eq('ref', decision.ref);
    }
  }
  return stats;
}

exports.run = run;
exports.handler = async () => {
  try {
    return json(200, { ok: true, ...(await run(getServiceClient())) });
  } catch (err) {
    return handleError(err, 'engagement-cron');
  }
};
