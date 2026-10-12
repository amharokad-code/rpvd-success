'use strict';
// Fonction planifiée (1x/jour, voir netlify.toml) : séquence courriel des demandes de capsule.
//   ready      : une capsule publiée correspond au sujet demandé
//   j3         : dernière chance, 3 jours avant la VRAIE date d'examen (seulement si une capsule existe)
//   j1         : rappel court la veille (désactivé sauf CAPSULE_J1_ENABLED=1)
//   post_exam  : lendemain de l'examen, « comment ça s'est passé ? »
// Stop : consentement absent, désabonné, achat (status purchased) ou demande close. Les relances de
// vente ne partent jamais après J-1. email_events (unique par demande+type) empêche les doublons.

const { json, handleError } = require('./_lib/http');
const { getServiceClient } = require('./_lib/supabase');
const { sendEmail, capsuleReadyEmail, capsuleLastChanceEmail, capsuleJ1Email, capsulePostExamEmail } = require('./_lib/email');
const { daysUntil, formatDateFr, capsuleUrl, unsubscribeLinksFor } = require('./_lib/capsules');
const { unsubscribeHeaders, siteUrl } = require('./_lib/legal');

// Quel courriel envoyer à cette demande aujourd'hui ? (fonction pure, testable)
function nextKind(request, hasCapsule, sentKinds, now = new Date(), j1Enabled = false) {
  if (!request.consent_email || request.unsubscribed_at || request.status === 'purchased' || request.status === 'closed') return null;
  const d = request.exam_date ? daysUntil(request.exam_date, now) : null;
  const sent = new Set(sentKinds);
  if (d !== null && d <= -1 && d >= -3 && !sent.has('post_exam')) return 'post_exam';
  if (d !== null && d < 0) return null; // examen passé : plus de vente
  if (hasCapsule && d !== null && d === 1 && j1Enabled && !sent.has('j1')) return 'j1';
  if (hasCapsule && d !== null && d >= 1 && d <= 3 && !sent.has('j3') && !sent.has('j1')) return 'j3';
  if (hasCapsule && !sent.has('ready')) return 'ready';
  return null;
}

function buildMessage(kind, request, capsule, unsubscribe) {
  const url = capsule ? capsuleUrl(capsule.slug) : siteUrl();
  const base = { topic: request.topic, unsubscribe };
  if (kind === 'ready') return capsuleReadyEmail({ ...base, level: request.level, url });
  if (kind === 'j3') return capsuleLastChanceEmail({ ...base, examDate: formatDateFr(request.exam_date), url });
  if (kind === 'j1') return capsuleJ1Email({ ...base, url });
  return capsulePostExamEmail({ ...base, url: `${siteUrl()}/#demande` });
}

async function run(db, now = new Date()) {
  const { data: requests, error } = await db
    .from('capsule_requests')
    .select('*')
    .eq('consent_email', true)
    .is('unsubscribed_at', null)
    .in('status', ['open', 'notified'])
    .limit(2000);
  if (error) throw error;
  const { data: caps, error: ce } = await db.from('capsules').select('slug,topic_key').eq('published', true);
  if (ce) throw ce;
  const capByTopic = new Map((caps || []).map((c) => [c.topic_key, c]));
  const { data: events, error: ee } = await db.from('email_events').select('request_id,kind').in('request_id', (requests || []).map((r) => r.id));
  if (ee) throw ee;
  const sentBy = new Map();
  for (const ev of events || []) sentBy.set(ev.request_id, [...(sentBy.get(ev.request_id) || []), ev.kind]);

  const j1Enabled = process.env.CAPSULE_J1_ENABLED === '1';
  const stats = { sent: 0, skipped: 0, failed: 0 };
  for (const request of requests || []) {
    const capsule = capByTopic.get(request.topic_key) || null;
    const kind = nextKind(request, Boolean(capsule), sentBy.get(request.id) || [], now, j1Enabled);
    if (!kind) { stats.skipped += 1; continue; }

    // Réserver l'envoi d'abord : la contrainte unique bloque tout doublon (exécutions concurrentes).
    const { error: lockError } = await db.from('email_events').insert({ request_id: request.id, kind });
    if (lockError) { stats.skipped += 1; continue; }

    const links = unsubscribeLinksFor(request.id);
    const message = buildMessage(kind, request, capsule, links);
    const { sent } = await sendEmail({ to: request.email, ...message, headers: unsubscribeHeaders(links) });
    if (sent) {
      stats.sent += 1;
      if (kind === 'ready') await db.from('capsule_requests').update({ status: 'notified' }).eq('id', request.id);
    } else {
      stats.failed += 1;
      await db.from('email_events').delete().eq('request_id', request.id).eq('kind', kind); // nouvel essai demain
    }
  }
  return stats;
}

exports.nextKind = nextKind;
exports.handler = async () => {
  try {
    return json(200, { ok: true, ...(await run(getServiceClient())) });
  } catch (err) {
    return handleError(err, 'capsule-cron');
  }
};
