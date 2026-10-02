'use strict';
// POST /.netlify/functions/bootcamp-admin   (réservé à l'équipe : header x-admin-token)
//
//   { "action": "tally" }
//       → votes de la semaine regroupés par (niveau, matière, sujet), du plus demandé au moins demandé.
//
//   { "action": "notify", "dry_run": true|false, "selections": [
//       { "level": "Sec 4", "subject": "Mathématiques", "topic": "Fonctions (…)",
//         "when": "dimanche 4 octobre à 14 h", "url": "https://calendly.com/…", "price": "12 $" } ] }
//       → pour chaque votant de la semaine non encore notifié : « sujet retenu » (avec le lien)
//         s'il correspond à une sélection, sinon « pas cette semaine ». dry_run (défaut) : ne
//         fait que compter, n'envoie rien.
//
// Jeton : variable d'environnement BOOTCAMP_ADMIN_TOKEN (à créer dans Netlify, longue chaîne aléatoire).

const crypto = require('crypto');
const { HttpError, preflight, parseBody, json, header, handleError } = require('./_lib/http');
const { getServiceClient } = require('./_lib/supabase');
const { sendEmail, bootcampSelectedEmail, bootcampNotSelectedEmail } = require('./_lib/email');

function weekKey(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (day - 1));
  return d.toISOString().slice(0, 10);
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

function siteUrl() {
  return (process.env.URL || 'https://rpvdsuccess.com').replace(/\/+$/, '');
}

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;

  try {
    const expected = process.env.BOOTCAMP_ADMIN_TOKEN;
    const given = header(event, 'x-admin-token');
    if (!expected || !given || !safeEqual(expected, given)) throw new HttpError(401, 'UNAUTHORIZED', 'Accès refusé.');

    const body = parseBody(event);
    const db = getServiceClient();
    const key = typeof body.week_key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.week_key) ? body.week_key : weekKey();

    const { data: votes, error } = await db
      .from('bootcamp_votes')
      .select('id, email, level, subject, topic, topic_other, notified_at')
      .eq('week_key', key);
    if (error) throw error;

    if (body.action === 'tally') {
      const groups = new Map();
      for (const v of votes) {
        const k = `${v.level}|${v.subject}|${v.topic}`;
        groups.set(k, (groups.get(k) || 0) + 1);
      }
      const tally = [...groups.entries()]
        .map(([k, count]) => {
          const [level, subject, topic] = k.split('|');
          return { level, subject, topic, votes: count };
        })
        .sort((a, b) => b.votes - a.votes);
      return json(200, { ok: true, week_key: key, total_votes: votes.length, tally });
    }

    if (body.action === 'notify') {
      const selections = Array.isArray(body.selections) ? body.selections : [];
      if (selections.length === 0) throw new HttpError(400, 'BAD_REQUEST', 'Aucune sélection.');
      for (const s of selections) {
        if (!s || !s.level || !s.subject || !s.topic || !s.when || !/^https:\/\//.test(s.url || '')) {
          throw new HttpError(400, 'BAD_REQUEST', 'Sélection incomplète (level, subject, topic, when, url https).');
        }
      }
      const dryRun = body.dry_run !== false;
      const pending = votes.filter((v) => !v.notified_at);
      const plan = pending.map((v) => {
        const sel = selections.find((s) => s.level === v.level && s.subject === v.subject && s.topic === v.topic);
        return { vote: v, sel };
      });
      const summary = {
        pending: pending.length,
        selected: plan.filter((p) => p.sel).length,
        not_selected: plan.filter((p) => !p.sel).length,
      };
      if (dryRun) return json(200, { ok: true, dry_run: true, ...summary });

      let sent = 0;
      let failed = 0;
      for (const { vote, sel } of plan) {
        const shown = vote.topic_other ? `${vote.topic} : ${vote.topic_other}` : vote.topic;
        const message = sel
          ? bootcampSelectedEmail({ topic: shown, level: vote.level, when: sel.when, url: sel.url, price: sel.price || '12 $' })
          : bootcampNotSelectedEmail({ topic: shown, level: vote.level, url: `${siteUrl()}/app?src=bootcamp` });
        const { sent: ok } = await sendEmail({ to: vote.email, ...message });
        if (ok) {
          sent += 1;
          await db
            .from('bootcamp_votes')
            .update({ notified_at: new Date().toISOString(), notified_kind: sel ? 'selected' : 'not_selected' })
            .eq('id', vote.id);
        } else {
          failed += 1; // non marqué : un nouvel appel réessaiera seulement ceux-là
        }
      }
      return json(200, { ok: true, dry_run: false, ...summary, sent, failed });
    }

    throw new HttpError(400, 'BAD_REQUEST', 'action inconnue (tally | notify).');
  } catch (err) {
    return handleError(err, 'bootcamp-admin');
  }
};
