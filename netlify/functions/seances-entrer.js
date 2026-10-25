'use strict';
// POST { id, prenom, courriel, attest } → l'élève entre dans une séance (entrée libre, aucun paiement).
// Le lien de la salle part par courriel ; le fondateur reçoit une alerte avec le prénom et le courriel.
// Rien n'est stocké en base : le courriel de l'alerte sert de liste d'inscrits.

const { HttpError, preflight, parseBody, json, getIp, sha256, handleError } = require('./_lib/http');
const { assertRateLimit } = require('./_lib/ratelimit');
const { sendEmail } = require('./_lib/email');
const { BUSINESS, senderLine } = require('./_lib/legal');
const { findSeance, statusOf, cleanEmail, cleanName, escapeHtml, whenLabel, PRICE_CENTS } = require('./_lib/seances');

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;
  try {
    const body = parseBody(event);
    const seance = findSeance(String(body.id || ''));
    if (!seance || statusOf(seance) === 'done') throw new HttpError(404, 'BAD_REQUEST', 'Cette séance est terminée ou introuvable.');
    const email = cleanEmail(body.courriel);
    const prenom = cleanName(body.prenom);
    if (!email) throw new HttpError(400, 'BAD_REQUEST', 'Entre un courriel valide.');
    if (!prenom) throw new HttpError(400, 'BAD_REQUEST', 'Entre ton prénom.');
    // Loi 25 : l'élève atteste avoir 14 ans ou plus, ou l'accord d'un parent ou tuteur.
    if (body.attest !== true) throw new HttpError(400, 'BAD_REQUEST', 'Coche la case : 14 ans ou plus, ou accord d’un parent.');

    await assertRateLimit(`seance:ip:${sha256(getIp(event))}`, 8, 3600);

    const meet = process.env.SEANCE_MEET_URL || '';
    const when = whenLabel(seance);
    const price = `${(PRICE_CENTS / 100).toFixed(0)} $`;
    const link = /^https:\/\//.test(meet)
      ? `<p style="margin:20px 0"><a href="${escapeHtml(meet)}" style="background:#2f8f7e;color:#fff;padding:14px 26px;border-radius:12px;text-decoration:none;font-weight:700">Rejoindre la séance</a></p>`
      : '<p>Le lien de la salle t’arrive par courriel avant le début.</p>';

    const mail = await sendEmail({
      to: email,
      subject: `Ta place : ${seance.sujet} (${seance.niveau})`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#222;line-height:1.6">
<h2>Salut ${escapeHtml(prenom)}, ta place est réservée</h2>
<p><strong>${escapeHtml(seance.matiere)} ${escapeHtml(seance.niveau)} : ${escapeHtml(seance.sujet)}</strong><br>${escapeHtml(when)} · ${seance.dureeMin} minutes · en direct</p>
${link}
<p>L’entrée est libre. Si la séance t’a aidé, tu peux la payer à la fin : <strong>${price}</strong>, paiement unique, sans abonnement.</p>
<p style="font-size:12px;color:#777">${escapeHtml(senderLine())}. Tu n’as rien demandé ? Ignore ce courriel.</p></div>`,
      text: `Salut ${prenom}, ta place est réservée : ${seance.sujet} (${seance.niveau}), ${when}. ${meet || 'Le lien arrive avant le début.'} Entrée libre ; ${price} à la fin si ça t’a aidé.`,
    });

    // Alerte fondateur (best-effort) : sert de liste d'inscrits.
    await sendEmail({
      to: process.env.EMA_NOTIFY_EMAIL || BUSINESS.email,
      subject: `Nouvelle entrée RPVD Tutorat : ${prenom}`,
      html: `<p>${escapeHtml(prenom)} (${escapeHtml(email)}) entre dans <strong>${escapeHtml(seance.sujet)}</strong>, ${escapeHtml(when)}.</p>`,
      text: `${prenom} (${email}) entre dans ${seance.sujet}, ${when}.`,
    });

    return json(200, { ok: true, courriel_envoye: mail.sent === true });
  } catch (err) {
    return handleError(err, 'seances-entrer');
  }
};
