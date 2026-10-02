'use strict';
// POST /.netlify/functions/submit-vote
// Vote « Vote & Clutch » du formulaire /. Un vote par courriel et par semaine (le dernier
// remplace le précédent tant qu'aucun courriel de sélection n'est parti). Envoie la
// confirmation par courriel (best-effort : un échec d'envoi ne casse jamais le vote).

const { HttpError, preflight, parseBody, json, getIp, sha256, handleError } = require('./_lib/http');
const { getServiceClient } = require('./_lib/supabase');
const { assertRateLimit } = require('./_lib/ratelimit');
const { sendEmail, bootcampVoteEmail } = require('./_lib/email');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LEVELS = ['Sec 1', 'Sec 2', 'Sec 3', 'Sec 4', 'Sec 5'];
const SUBJECTS = ['Mathématiques', 'Sciences', 'Physique', 'Chimie'];

// Lundi (UTC) de la semaine courante, au format YYYY-MM-DD : clé de regroupement hebdomadaire.
function weekKey(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (day - 1));
  return d.toISOString().slice(0, 10);
}

function clean(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;

  try {
    const body = parseBody(event);

    // Anti-bot : champ piège rempli = on fait semblant d'accepter.
    if (clean(body.bot_field, 50)) return json(200, { ok: true });

    const email = clean(body.email, 254).toLowerCase();
    const level = clean(body.level, 20);
    const subject = clean(body.subject, 40);
    const topic = clean(body.topic, 120);
    const topicOther = clean(body.topic_other, 200);
    const exams = clean(body.exams, 300);
    const source = clean(body.source, 60) || null;

    if (!EMAIL_PATTERN.test(email)) throw new HttpError(400, 'BAD_REQUEST', 'Courriel invalide.');
    if (!LEVELS.includes(level) || !SUBJECTS.includes(subject) || !topic) {
      throw new HttpError(400, 'BAD_REQUEST', 'Niveau, matière ou sujet invalide.');
    }

    const ipHash = sha256(getIp(event));
    await assertRateLimit(`vote:ip:${ipHash}`, 10, 3600);

    const db = getServiceClient();
    const key = weekKey();

    // Un vote déjà notifié n'est plus modifiable (le tri de la semaine est fait).
    const { data: existing, error: readError } = await db
      .from('bootcamp_votes')
      .select('id, notified_at')
      .eq('email', email)
      .eq('week_key', key)
      .maybeSingle();
    if (readError) throw readError;
    if (existing && existing.notified_at) return json(200, { ok: true, locked: true });

    const row = {
      email,
      level,
      subject,
      topic,
      topic_other: topicOther || null,
      exams: exams || null,
      source,
      week_key: key,
      ip_hash: ipHash,
    };
    const { error } = await db.from('bootcamp_votes').upsert(row, { onConflict: 'email,week_key' });
    if (error) throw error;

    const shown = topicOther ? `${topic} : ${topicOther}` : topic;
    await sendEmail({ to: email, ...bootcampVoteEmail({ topic: shown, level }) });

    return json(200, { ok: true });
  } catch (err) {
    return handleError(err, 'submit-vote');
  }
};
