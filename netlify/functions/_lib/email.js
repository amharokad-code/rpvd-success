'use strict';
// Envoi de courriels via l'API Resend (fetch natif) + gabarits FR.
// `sendEmail` ne lance jamais : un échec d'envoi ne doit pas casser le flux métier.

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'RPVD Success <onboarding@resend.dev>';

const REGION_WORDS = {
  qc: { look: 'Check tes codes juste ici', bye: "C'est good, à toi de jouer !" },
  fr: { look: 'Regarde tes codes juste là', bye: "C'est clair, à toi de jouer !" },
  us: { look: 'Check out your codes right here', bye: "Awesome, you're all set — go for it!" },
  uk: { look: 'Have a look at your codes right here', bye: 'Brilliant, off you go!' },
};

// Échappement HTML minimal pour tout texte injecté dans les gabarits.
function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Bloc « code en gros » (monospace, lisible sur mobile).
function codeBlock(code) {
  return `<div style="margin:12px 0;padding:16px 20px;background:#0f172a;border:1px solid rgba(255,255,255,0.08);border-radius:16px;text-align:center;">
  <span style="font-family:'Inconsolata',Menlo,Consolas,monospace;font-size:28px;font-weight:700;letter-spacing:4px;color:#fbbf24;">${escapeHtml(code)}</span>
</div>`;
}

// Mise en page sombre commune (fond slate-900, carte slate-800, titre amber).
function layout({ title, paragraphs, codes = [], outro = [] }) {
  const p = (text) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#e2e8f0;">${text}</p>`;
  return `<!doctype html>
<html lang="fr">
<body style="margin:0;padding:0;background:#0f172a;font-family:Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f172a;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#1e293b;border:1px solid rgba(255,255,255,0.06);border-radius:24px;padding:32px 28px;">
        <tr><td>
          <p style="margin:0 0 6px;font-size:14px;font-weight:700;letter-spacing:1px;color:#f59e0b;">RPVD Success</p>
          <h1 style="margin:0 0 20px;font-size:26px;line-height:1.25;font-weight:800;color:#f8fafc;">${escapeHtml(title)}</h1>
          ${paragraphs.map((text) => p(escapeHtml(text))).join('\n')}
          ${codes.map(codeBlock).join('\n')}
          ${outro.map((text) => p(escapeHtml(text))).join('\n')}
          <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#94a3b8;">Tu n'as rien demandé ? Ignore simplement ce courriel.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Version texte brut (clients sans HTML).
function plainText({ title, paragraphs, codes = [], outro = [] }) {
  return [title, '', ...paragraphs, '', ...codes.map((c) => `  ${c}`), '', ...outro].join('\n').trim();
}

// Contenu localisé (contrat §3, quadri-langue) : titre/sujet + paragraphes + consignes.
const TRIAL_EMAIL_TEXT = {
  qc: {
    subject: "Tes 3 codes d'essai RPVD Success 🎁",
    title: "Tes codes d'essai gratuits sont là 🎁",
    intro: (look) => `Salut ! ${look} : chaque code donne 3 analyses de devoirs et se lie à un seul appareil. Un enfant, un appareil, un code.`,
    howTo: "Pour activer : ouvre l'app RPVD Success, va dans « J'ai un code », tape-le et c'est parti.",
    validity: 'Les codes sont valides 30 jours.',
  },
  fr: {
    subject: "Tes 3 codes d'essai RPVD Success 🎁",
    title: "Tes codes d'essai gratuits sont là 🎁",
    intro: (look) => `Salut ! ${look} : chaque code donne 3 analyses de devoirs et se lie à un seul appareil. Un enfant, un appareil, un code.`,
    howTo: "Pour activer : ouvre l'app RPVD Success, va dans « J'ai un code », tape-le et c'est parti.",
    validity: 'Les codes sont valides 30 jours.',
  },
  us: {
    subject: 'Your 3 RPVD Success trial codes 🎁',
    title: 'Your free trial codes are here 🎁',
    intro: (look) => `Hey! ${look}: each code gives 3 homework analyses and locks to one device. One kid, one device, one code.`,
    howTo: 'To activate: open the RPVD Success app, go to "I have a code", type it in, and you\'re set.',
    validity: 'Codes are valid for 30 days.',
  },
  uk: {
    subject: 'Your 3 RPVD Success trial codes 🎁',
    title: 'Your free trial codes are here 🎁',
    intro: (look) => `Hiya! ${look}: each code gives 3 homework analyses and locks to one device. One kid, one device, one code.`,
    howTo: 'To activate: open the RPVD Success app, go to "I have a code", type it in, and off you go.',
    validity: 'Codes are valid for 30 days.',
  },
};

// Courriel des 3 codes d'essai.
function trialCodesEmail({ codes, region = 'qc' }) {
  const words = REGION_WORDS[region] || REGION_WORDS.qc;
  const text = TRIAL_EMAIL_TEXT[region] || TRIAL_EMAIL_TEXT.qc;
  const content = {
    title: text.title,
    paragraphs: [text.intro(words.look)],
    codes,
    outro: [text.howTo, text.validity, words.bye],
  };
  return { subject: text.subject, html: layout(content), text: plainText(content) };
}

// Courriel du code premium après paiement Stripe.
function premiumCodeEmail({ code, plan, credits }) {
  const label = plan === 'trio' ? 'Trio' : 'Solo';
  const content = {
    title: `Merci ! Voici ton code ${label} ⚡`,
    paragraphs: [
      `Ton paiement est passé. Ce code débloque ${credits} analyses, valides 3 mois à partir de l'activation.`,
    ],
    codes: [code],
    outro: [
      "Pour activer : ouvre l'app RPVD Success, va dans « J'ai un code », tape-le et c'est parti.",
      'Garde ce courriel précieusement : le code est à usage unique.',
    ],
  };
  return { subject: `Ton code RPVD Success (${label}) ⚡`, html: layout(content), text: plainText(content) };
}

// Courriel de confirmation après activation d'un code.
function activationConfirmedEmail({ plan, credits }) {
  const labels = { trial: 'Essai gratuit', solo: 'Solo', trio: 'Trio' };
  const label = labels[plan] || plan;
  const content = {
    title: 'Code activé, on est prêts ✅',
    paragraphs: [
      `Ton code ${label} est activé : ${credits} crédits sont disponibles sur cet appareil.`,
    ],
    codes: [],
    outro: ['Prends ton devoir en photo, et on décortique ça ensemble.'],
  };
  return { subject: `Code activé : ${credits} crédits ajoutés ✅`, html: layout(content), text: plainText(content) };
}

// Envoi via Resend. Renvoie { sent: boolean }, ne lance jamais.
async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY absente : courriel non envoyé.');
    return { sent: false };
  }
  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || DEFAULT_FROM,
        to: [to],
        subject,
        html,
        text,
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error(`[email] Resend HTTP ${response.status}: ${detail.slice(0, 300)}`);
      return { sent: false };
    }
    return { sent: true };
  } catch (err) {
    console.error('[email] Envoi impossible :', err && err.message ? err.message : err);
    return { sent: false };
  }
}

module.exports = { sendEmail, trialCodesEmail, premiumCodeEmail, activationConfirmedEmail, escapeHtml };
