'use strict';
// Envoi de courriels via l'API Resend (fetch natif) + gabarits FR.
// `sendEmail` ne lance jamais : un échec d'envoi ne doit pas casser le flux métier.

const { senderLine, unsubscribeHeaders } = require('./legal');

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
  return `<div style="margin:12px 0;padding:16px 20px;background:#0b0b0c;border:1px solid rgba(242,153,74,0.25);border-radius:16px;text-align:center;">
  <span style="font-family:'Inconsolata',Menlo,Consolas,monospace;font-size:28px;font-weight:700;letter-spacing:4px;color:#f2994a;">${escapeHtml(code)}</span>
</div>`;
}

// Bouton d'action (lien https uniquement, jamais d'URL arbitraire non validée).
function buttonBlock({ label, url }) {
  if (!/^https:\/\//.test(url || '')) return '';
  return `<p style="margin:24px 0;text-align:center;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:15px 30px;background:#f2994a;background-image:linear-gradient(180deg,#f5ad6b,#e07b2e);color:#0b0b0c;font-weight:800;font-size:16px;text-decoration:none;border-radius:14px;">${escapeHtml(label)}</a></p>`;
}

// Fiche « clé : valeur » (détails d'une session, d'un billet…).
function rowsBlock(rows) {
  if (!rows || rows.length === 0) return '';
  const tr = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:9px 16px 9px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:14px;color:#8b8d91;white-space:nowrap;">${escapeHtml(k)}</td><td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:15px;color:#f5f5f0;font-weight:600;text-align:right;">${escapeHtml(v)}</td></tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:6px 0 20px;background:#0b0b0c;border:1px solid rgba(242,153,74,0.18);border-radius:16px;padding:6px 18px;">${tr}</table>`;
}

const DEFAULT_FOOTER = "Tu n'as rien demandé ? Ignore simplement ce courriel.";

// Mise en page aux couleurs de la marque (noir du logo, orange pyramide, blanc cassé).
function layout({ title, paragraphs = [], codes = [], rows = [], outro = [], button = null, footer = DEFAULT_FOOTER, unsubscribe = null }) {
  const p = (text) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#d8d8d2;">${text}</p>`;
  return `<!doctype html>
<html lang="fr">
<body style="margin:0;padding:0;background:#000000;font-family:Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#000000;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:540px;background:#111113;border:1px solid rgba(242,153,74,0.16);border-radius:24px;padding:32px 28px;">
        <tr><td>
          <p style="margin:0 0 4px;font-size:12px;font-weight:800;letter-spacing:3px;color:#f2994a;">RPVD SUCCESS</p>
          <div style="height:3px;width:44px;background:#f2994a;border-radius:3px;margin:0 0 18px;"></div>
          <h1 style="margin:0 0 20px;font-size:26px;line-height:1.25;font-weight:800;color:#f5f5f0;">${escapeHtml(title)}</h1>
          ${paragraphs.map((text) => p(escapeHtml(text))).join('\n')}
          ${rowsBlock(rows)}
          ${codes.map(codeBlock).join('\n')}
          ${button ? buttonBlock(button) : ''}
          ${outro.map((text) => p(escapeHtml(text))).join('\n')}
          ${footer ? `<p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#6b6d70;">${escapeHtml(footer)}</p>` : ''}
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#4a4b4e;">${escapeHtml(senderLine())}${unsubscribe ? `<br><a href="${escapeHtml(unsubscribe.page)}" style="color:#6b6d70;">Ne plus recevoir les annonces du Bootcamp</a>` : ''}</p>
    </td></tr>
  </table>
</body>
</html>`;
}

// Version texte brut (clients sans HTML).
function plainText({ title, paragraphs = [], codes = [], rows = [], outro = [], button = null, unsubscribe = null }) {
  const link = button ? ['', `${button.label} : ${button.url}`] : [];
  const details = rows.length ? ['', ...rows.map(([k, v]) => `${k} : ${v}`)] : [];
  const legal = ['', '—', senderLine(), ...(unsubscribe ? [`Ne plus recevoir les annonces : ${unsubscribe.page}`] : [])];
  return [title, '', ...paragraphs, ...details, '', ...codes.map((c) => `  ${c}`), ...link, '', ...outro, ...legal].join('\n').trim();
}

// Contenu localisé (contrat §3, quadri-langue) : titre/sujet + paragraphes + consignes.
const TRIAL_EMAIL_TEXT = {
  qc: {
    subject: "Tes 3 codes d'essai RPVD Success 🎁",
    title: "Tes codes d'essai gratuits sont là 🎁",
    intro: (look) => `Salut ! ${look} : chaque code donne 3 analyses de devoirs et se lie à un seul appareil. Un enfant, un appareil, un code.`,
    howTo: "Pour activer : ouvre le site RPVD Success, va dans « J'ai un code », tape-le et c'est parti.",
    validity: 'Les codes sont valides 30 jours.',
  },
  fr: {
    subject: "Tes 3 codes d'essai RPVD Success 🎁",
    title: "Tes codes d'essai gratuits sont là 🎁",
    intro: (look) => `Salut ! ${look} : chaque code donne 3 analyses de devoirs et se lie à un seul appareil. Un enfant, un appareil, un code.`,
    howTo: "Pour activer : ouvre le site RPVD Success, va dans « J'ai un code », tape-le et c'est parti.",
    validity: 'Les codes sont valides 30 jours.',
  },
  us: {
    subject: 'Your 3 RPVD Success trial codes 🎁',
    title: 'Your free trial codes are here 🎁',
    intro: (look) => `Hey! ${look}: each code gives 3 homework analyses and locks to one device. One kid, one device, one code.`,
    howTo: 'To activate: open the RPVD Success site, go to "I have a code", type it in, and you\'re set.',
    validity: 'Codes are valid for 30 days.',
  },
  uk: {
    subject: 'Your 3 RPVD Success trial codes 🎁',
    title: 'Your free trial codes are here 🎁',
    intro: (look) => `Hiya! ${look}: each code gives 3 homework analyses and locks to one device. One kid, one device, one code.`,
    howTo: 'To activate: open the RPVD Success site, go to "I have a code", type it in, and off you go.',
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

// Courriel du/des code(s) premium après paiement Stripe. Trio = 3 codes séparés (un par
// personne/appareil, contrat) — chaque compte reste verrouillé à 1 seul appareil pour toujours ;
// ce n'est PAS 1 compte partagé à 150 crédits.
function premiumCodeEmail({ codes, plan, credits }) {
  const label = plan === 'trio' ? 'Trio' : 'Solo';
  const multiple = codes.length > 1;
  const content = {
    title: multiple ? `Merci ! Voici tes ${codes.length} codes ${label} ⚡` : `Merci ! Voici ton code ${label} ⚡`,
    paragraphs: multiple
      ? [
          `Ton paiement est passé. Voici ${codes.length} codes distincts, chacun bon pour ${credits} analyses (3 mois à partir de l'activation) sur UN appareil — un pour toi, les 2 autres pour tes amis ou tes autres appareils.`,
        ]
      : [`Ton paiement est passé. Ce code débloque ${credits} analyses, valides 3 mois à partir de l'activation.`],
    codes,
    outro: [
      multiple
        ? "Pour activer : chacun ouvre le site RPVD Success sur SON appareil, va dans « J'ai un code », tape un des codes ci-dessus (un code par appareil)."
        : "Pour activer : ouvre le site RPVD Success, va dans « J'ai un code », tape-le et c'est parti.",
      'Garde ce courriel précieusement : chaque code est à usage unique.',
    ],
  };
  return {
    subject: multiple ? `Tes ${codes.length} codes RPVD Success (${label}) ⚡` : `Ton code RPVD Success (${label}) ⚡`,
    html: layout(content),
    text: plainText(content),
  };
}

// Courriel de mise à niveau Base → Premium (contrat pricing v2) : pas de code, les crédits et
// le plan sont déjà appliqués au compte au moment de l'envoi.
function premiumUpgradeEmail({ plan, credits }) {
  const label = plan === 'premium_trio' ? 'Premium Trio' : 'Premium';
  const content = {
    title: `Bienvenue dans le ${label} ⚡`,
    paragraphs: [
      `Ton paiement est passé. Ton compte a maintenant ${credits} crédits (3 mois à partir d'aujourd'hui) sur cet appareil — rien à activer, c'est déjà fait.`,
    ],
    codes: [],
    outro: ['Prends ton prochain devoir en photo, et on décortique ça ensemble.'],
  };
  return { subject: `Mise à niveau ${label} confirmée ⚡`, html: layout(content), text: plainText(content) };
}

// Courriel de première activation d'un abonnement Basic/Pro (contrat pricing v3) — pas de code,
// mentionne explicitement le renouvellement automatique (honnêteté commerciale, contrat) et
// comment l'annuler.
function subscriptionActivatedEmail({ plan, credits }) {
  const label = plan === 'pro' ? 'Pro' : 'Basic';
  const content = {
    title: `Bienvenue dans le forfait ${label} ⚡`,
    paragraphs: [
      `Ton paiement est passé. Ton compte a maintenant ${credits} crédits sur cet appareil — rien à activer, c'est déjà fait.`,
      `C'est un abonnement : ${credits} crédits reviendront automatiquement chaque mois, et ta carte sera débitée à chaque renouvellement. Tu peux annuler à tout moment depuis les Réglages de l'app.`,
    ],
    codes: [],
    outro: ['Prends ton prochain devoir en photo, et on décortique ça ensemble.'],
  };
  return { subject: `Abonnement ${label} confirmé ⚡`, html: layout(content), text: plainText(content) };
}

// Courriel de renouvellement automatique (invoice.paid, cycle suivant) — juste une confirmation,
// pas d'action requise.
function subscriptionRenewedEmail({ plan, credits }) {
  const label = plan === 'pro' ? 'Pro' : 'Basic';
  const content = {
    title: `Ton forfait ${label} vient d'être renouvelé 🔄`,
    paragraphs: [
      `Tes ${credits} crédits sont de retour pour un mois de plus. Ta carte a été débitée automatiquement, comme prévu à l'abonnement.`,
    ],
    codes: [],
    outro: ["Envie d'arrêter ? Tu peux annuler à tout moment depuis les Réglages de l'app."],
  };
  return { subject: `Forfait ${label} renouvelé 🔄`, html: layout(content), text: plainText(content) };
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

// --- Académie RPVD : courriels du Bootcamp ------------------------------------------------
// Ton : direct, « tu », jamais de fausse urgence. Toute date/heure est déjà formatée en heure
// du Québec par l'appelant (_lib/bootcamp.js → formatWhen).

const BOOTCAMP_FOOTER = 'Bootcamp RPVD · une question ? Réponds simplement à ce courriel.';

function mk(content, subject) {
  const headers = unsubscribeHeaders(content.unsubscribe);
  return { subject, html: layout(content), text: plainText(content), ...(headers ? { headers } : {}) };
}

// 1. Confirmation immédiate du vote.
function bootcampVoteEmail({ topic, level }) {
  return mk(
    {
      title: 'Vote reçu ✅',
      paragraphs: [
        `Ton vote est enregistré : « ${topic} » (${level}).`,
        'Jeudi à 17 h, on retient les 4 sujets les plus demandés au Québec. Si le tien en fait partie, tu reçois un courriel avec ta place à réserver pour dimanche.',
      ],
      outro: ['Garde un œil sur ta boîte de réception (et sur les courriels indésirables).'],
      footer: BOOTCAMP_FOOTER,
    },
    'Vote reçu : réponse jeudi 17 h ✅',
  );
}

// 2. Sujet sélectionné : lien de réservation.
function bootcampSelectedEmail({ topic, level, subject, when, price, deadline, url , unsubscribe }) {
  return mk(
    {
      title: 'Ton sujet a été SÉLECTIONNÉ 🎯',
      paragraphs: [
        `Félicitations : « ${topic} » fait partie des 4 sujets retenus ce dimanche.`,
        `Réserve ta place avant ${deadline}. Après, les ventes ferment.`,
      ],
      rows: [
        ['Sujet', topic],
        ['Niveau', `${level} · ${subject}`],
        ['Quand', when],
        ['Durée', '1 h 30 en direct en ligne'],
        ['Prix', `${price} tout inclus`],
      ],
      button: { label: 'Réserver ma place', url },
      outro: [
        `Remboursement intégral sur simple demande jusqu'à ${deadline}.`,
        'Moins de 18 ans ? La réservation doit être faite par un parent ou un tuteur.',
      ],
      footer: BOOTCAMP_FOOTER,
      unsubscribe,
    },
    `Ton sujet « ${topic} » a été sélectionné 🎯`,
  );
}

// 3. Sujet non retenu : les autres sessions restent ouvertes à tous + l'outil d'analyse disponible
// tout de suite. Chiffres réels seulement (essai de 3 analyses, Basic 9 $ CAD / mois, tutorat privé
// ~40 $ de l'heure comme sur le paywall) : aucune promesse de note, aucun superlatif.
function bootcampNotSelectedEmail({ topic, level, sessions = [], url, appUrl, unsubscribe }) {
  const rows = sessions.map((s) => [s.when, `${s.topic} (${s.level})`]);
  const appLink = appUrl || 'https://rpvdsuccess.com/app';
  return mk(
    {
      title: 'Pas ce dimanche pour ton sujet',
      paragraphs: [
        `« ${topic} » (${level}) n'a pas fait partie des 4 sujets les plus votés cette semaine.`,
        rows.length ? "Les sessions retenues sont ouvertes à tous, si l'une d'elles t'aide aussi :" : 'Ton vote compte : revote pour la semaine prochaine.',
      ],
      rows,
      button: url ? { label: 'Voir les sessions de dimanche', url } : null,
      outro: [
        "En attendant, tu n'as pas à attendre dimanche pour avancer : l'outil RPVD Success t'explique la démarche d'un exercice à partir d'une photo, en 3 niveaux, à toute heure.",
        `Essai gratuit de 3 analyses. Ensuite, Basic coûte 9 $ par mois (50 analyses), sans engagement, à comparer à environ 40 $ de l'heure pour un tuteur privé. Un adulte doit s'occuper de l'abonnement si tu as moins de 18 ans. À essayer : ${appLink}`,
      ],
      footer: BOOTCAMP_FOOTER,
      unsubscribe,
    },
    'Les sujets de dimanche sont choisis',
  );
}

// 4. Paiement confirmé : billet, règles de la classe, remboursement en un clic.
function bootcampTicketEmail({ topic, level, subject, when, price, refundDeadline, refundUrl, reference, termsUrl }) {
  return mk(
    {
      title: 'Ta place est réservée ✅',
      paragraphs: [`Paiement reçu. Ton billet pour le Bootcamp RPVD est confirmé.`],
      rows: [
        ['Sujet', topic],
        ['Niveau', `${level} · ${subject}`],
        ['Quand', when],
        ['Durée', '1 h 30 (1 h de démarche + 30 min de questions)'],
        ['Payé', `${price} tout inclus`],
        ...(reference ? [['Référence', reference]] : []),
      ],
      outro: [
        '🔗 Le lien du cours arrive par courriel 30 à 60 minutes avant le début. Ne le partage pas.',
        'Règles de la classe : arrive 5 minutes avant, prépare une feuille et un crayon, pose tes questions dans le chat, aucun enregistrement ni capture de la session.',
        `Remboursement intégral sur simple demande jusqu'à ${refundDeadline}, avec le bouton « Gérer / annuler ma réservation ». Aucun remboursement le dimanche, jour du cours.`,
        "Pendant le cours : caméra désactivée, micro coupé (activé seulement quand l'animateur te donne la parole). On ne te demande ni ton nom ni ton âge : tu apparais comme « Élève ».",
        ...(termsUrl ? [`Ce courriel est ta copie du contrat. Conditions complètes : ${termsUrl}`] : []),
      ],
      button: refundUrl ? { label: 'Gérer / annuler ma réservation', url: refundUrl } : null,
      footer: BOOTCAMP_FOOTER,
    },
    `Réservé : ${topic}, ${when} ✅`,
  );
}

// 5. Lien du cours, 30-60 min avant.
function bootcampZoomLinkEmail({ topic, when, joinUrl, personal }) {
  return mk(
    {
      title: 'Ton cours commence bientôt 🔴',
      paragraphs: [
        `« ${topic} » commence ${when}. Voici ton lien d'accès${personal ? ' personnel' : ''}.`,
      ],
      button: { label: 'Rejoindre le cours', url: joinUrl },
      outro: [
        personal
          ? 'Ce lien est à ton nom et ne fonctionne que sur un seul appareil à la fois. Ne le partage pas.'
          : 'Garde ce lien pour toi : il est réservé aux élèves inscrits.',
        'Feuille, crayon, et tes questions prêtes pour le chat. À tout de suite.',
      ],
      footer: BOOTCAMP_FOOTER,
    },
    `🔴 ${topic} : ton lien du cours`,
  );
}

// 6. Remboursement confirmé.
function bootcampRefundEmail({ topic, when, price }) {
  return mk(
    {
      title: 'Remboursement confirmé',
      paragraphs: [
        `Ta réservation pour « ${topic} » (${when}) est annulée et ${price} te sont remboursés.`,
        'Le montant apparaît sur ta carte d\'ici 5 à 10 jours ouvrables, selon ta banque.',
      ],
      footer: BOOTCAMP_FOOTER,
    },
    'Remboursement confirmé',
  );
}

// 7. Session annulée par RPVD : remboursement automatique.
function bootcampCancelledEmail({ topic, when, price }) {
  return mk(
    {
      title: 'Session annulée, tu es remboursé',
      paragraphs: [
        `Désolé : la session « ${topic} » prévue ${when} est annulée.`,
        `Tu es remboursé intégralement (${price}). Le montant apparaît sur ta carte d'ici 5 à 10 jours ouvrables.`,
      ],
      footer: BOOTCAMP_FOOTER,
    },
    'Session annulée : remboursement intégral',
  );
}

// 8. Places libérées (dimanche 8 h, seulement si de vrais désistements ont eu lieu).
function bootcampFreedSeatsEmail({ topic, when, seats, url , unsubscribe }) {
  return mk(
    {
      title: `${seats} place${seats > 1 ? 's' : ''} libérée${seats > 1 ? 's' : ''} 🔓`,
      paragraphs: [
        `Suite à des désistements, ${seats} place${seats > 1 ? 's se sont libérées' : ' s\'est libérée'} pour « ${topic} » (${when}).`,
        'Premier arrivé, premier servi. Les places réservées aujourd\'hui ne sont pas remboursables.',
      ],
      button: { label: 'Prendre une place', url },
      footer: BOOTCAMP_FOOTER,
      unsubscribe,
    },
    `🔓 ${topic} : ${seats} place${seats > 1 ? 's' : ''} libérée${seats > 1 ? 's' : ''}`,
  );
}

// 9. Lendemain : merci + passerelle vers l'outil d'analyse.
function bootcampFollowupEmail({ topic, appUrl, voteUrl , unsubscribe }) {
  return mk(
    {
      title: 'Bravo pour hier 💪',
      paragraphs: [
        `Tu as maintenant la démarche pour « ${topic} ». Pour la refaire sur n'importe quel exercice, à n'importe quelle heure : prends-le en photo, RPVD Success te donne le pattern en 3 niveaux.`,
      ],
      button: { label: 'Analyser un exercice', url: appUrl },
      outro: [`Un autre examen arrive ? Vote pour le sujet de dimanche prochain : ${voteUrl}`],
      footer: BOOTCAMP_FOOTER,
      unsubscribe,
    },
    'Garde la démarche avec toi',
  );
}

// Envoi via Resend. Renvoie { sent: boolean }, ne lance jamais.
async function sendEmail({ to, subject, html, text, headers }) {
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
        ...(headers ? { headers } : {}),
        ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
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

// Envoi groupé via l'API batch de Resend (100 courriels par requête) : indispensable pour
// notifier des centaines de votants sans dépasser la durée maximale d'une Netlify Function.
// Renvoie un tableau de booléens (un par message, true = accepté par Resend). Ne lance jamais.
async function sendBatch(messages) {
  const results = new Array(messages.length).fill(false);
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY absente : envoi groupé ignoré.');
    return results;
  }
  const from = process.env.EMAIL_FROM || DEFAULT_FROM;
  const replyTo = process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {};
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const response = await fetch(`${RESEND_ENDPOINT}/batch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk.map((m) => ({ from, to: [m.to], subject: m.subject, html: m.html, text: m.text, ...(m.headers ? { headers: m.headers } : {}), ...replyTo }))),
      });
      if (response.ok) {
        for (let j = 0; j < chunk.length; j += 1) results[i + j] = true;
      } else {
        const detail = await response.text().catch(() => '');
        console.error(`[email] Resend batch HTTP ${response.status}: ${detail.slice(0, 300)}`);
      }
    } catch (err) {
      console.error('[email] Envoi groupé impossible :', err && err.message ? err.message : err);
    }
    if (i + 100 < messages.length) await new Promise((r) => setTimeout(r, 600)); // limite de débit Resend
  }
  return results;
}

module.exports = {
  sendEmail,
  trialCodesEmail,
  premiumCodeEmail,
  premiumUpgradeEmail,
  subscriptionActivatedEmail,
  subscriptionRenewedEmail,
  activationConfirmedEmail,
  sendBatch,
  bootcampVoteEmail,
  bootcampSelectedEmail,
  bootcampNotSelectedEmail,
  bootcampTicketEmail,
  bootcampZoomLinkEmail,
  bootcampRefundEmail,
  bootcampCancelledEmail,
  bootcampFreedSeatsEmail,
  bootcampFollowupEmail,
  escapeHtml,
};
