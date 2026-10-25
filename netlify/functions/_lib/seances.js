'use strict';
// Séances en direct E.M.A. Tutorat : calendrier décidé par le fondateur (aucun sondage), entrée libre,
// paiement à la sortie. Le lien de la salle (SEANCE_MEET_URL) n'est jamais dans le code public :
// il part seulement par courriel à la personne qui entre.

const PRICE_CENTS = 1900; // 19 $ CAD, affiché avant l'entrée et facturé tel quel (aucun prix barré)
const CURRENCY = 'cad';
const OPENS_BEFORE_MIN = 15; // la salle ouvre 15 min avant le début

// Pour ajouter une séance : copier un bloc, changer id, titre, date (heure du Québec, avec -05:00 en hiver,
// -04:00 en été), puis déployer. `startsAt` doit toujours porter le décalage horaire.
const SEANCES = [
  {
    id: 'math-sec4-equations-2e-degre-2026-11-01',
    matiere: 'Mathématiques',
    niveau: 'Sec 4',
    sujet: 'Équations du 2e degré',
    startsAt: '2026-11-01T19:00:00-05:00',
    dureeMin: 60,
  },
];

function endsAt(seance) {
  return new Date(new Date(seance.startsAt).getTime() + seance.dureeMin * 60000);
}

// 'upcoming' avant l'ouverture, 'live' de l'ouverture à la fin, 'done' ensuite.
function statusOf(seance, now = new Date()) {
  const start = new Date(seance.startsAt).getTime();
  const t = now.getTime();
  if (t > endsAt(seance).getTime()) return 'done';
  if (t >= start - OPENS_BEFORE_MIN * 60000) return 'live';
  return 'upcoming';
}

// Séances encore utiles (en cours ou à venir), triées par date. Aucune donnée secrète.
function publicSeances(now = new Date(), list = SEANCES) {
  return list
    .filter((s) => statusOf(s, now) !== 'done')
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
    .map((s) => ({
      id: s.id,
      matiere: s.matiere,
      niveau: s.niveau,
      sujet: s.sujet,
      starts_at: new Date(s.startsAt).toISOString(),
      duree_min: s.dureeMin,
      status: statusOf(s, now),
    }));
}

function findSeance(id, list = SEANCES) {
  return list.find((s) => s.id === id) || null;
}

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
function cleanEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return EMAIL_RE.test(email) && email.length <= 254 ? email : null;
}
function cleanName(value) {
  return String(value || '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 60);
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Date lisible, heure du Québec.
function whenLabel(seance) {
  return new Intl.DateTimeFormat('fr-CA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Toronto',
  }).format(new Date(seance.startsAt));
}

// Origine autorisée pour les retours Stripe : jamais une valeur libre venue du client.
const ALLOWED_HOSTS = ['ematutorat.com', 'www.ematutorat.com', 'rpvdsuccess.com', 'www.rpvdsuccess.com'];
function originFor(event, fallback) {
  const h = (event && event.headers) || {};
  const host = String(h['x-forwarded-host'] || h.host || '').toLowerCase().split(':')[0];
  return ALLOWED_HOSTS.includes(host) ? `https://${host}` : fallback;
}

module.exports = {
  PRICE_CENTS,
  CURRENCY,
  SEANCES,
  statusOf,
  publicSeances,
  findSeance,
  cleanEmail,
  cleanName,
  escapeHtml,
  whenLabel,
  originFor,
};
