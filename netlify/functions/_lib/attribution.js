'use strict';
// Validation stricte de tout ce que le navigateur envoie pour la mesure publicitaire.
// Règle : une valeur du client n'est jamais fiable. On ne garde que des valeurs courtes, à jeu de
// caractères restreint ; le reste est retiré ou ignoré (jamais d'erreur côté client pour ça).
//   - étiquettes de campagne (src, utm_*) : texte court, lettres/chiffres/_-.:+ et espace seulement
//   - identifiants de clic (fbclid, ScCid) et témoins (_fbp, _fbc, _scid) : format exact, sinon ignorés
//   - IP et agent utilisateur : lus côté serveur, jamais fournis par le client
const crypto = require('crypto');
const net = require('net');

const LABEL_LIMITS = { src: 40, utm_source: 40, utm_medium: 40, utm_campaign: 80, utm_content: 80, utm_term: 80 };
const LABEL_KEYS = Object.keys(LABEL_LIMITS);
const SOURCE_MAX = 120; // colonne `source` (text, sans limite en base) : composite src|medium|campagne|contenu
const DAY_MS = 86400000;

// Coupe par points de code (jamais au milieu d'une paire de substitution).
function truncate(str, max) {
  return Array.from(str).slice(0, max).join('');
}

function cleanLabel(value, max = 80) {
  if (typeof value !== 'string') return null;
  const stripped = value
    .slice(0, 500)
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}_\-.:+ ]/gu, '')
    .replace(/ +/g, ' ')
    .trim();
  const out = truncate(stripped, max).trim();
  return out || null;
}

// { src, utm_source, utm_medium, utm_campaign, utm_content, utm_term } : seulement les valeurs valides.
function cleanAttribution(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const key of LABEL_KEYS) {
    const v = cleanLabel(raw[key], LABEL_LIMITS[key]);
    if (v) out[key] = v;
  }
  return out;
}

// Valeur de la colonne `source` (votes et billets) : « src|medium|campagne|contenu », positions
// stables (un champ vide reste vide). `src` prime sur `utm_source`. Null si rien n'est connu.
function composeSource(attr) {
  const a = attr || {};
  const parts = [a.src || a.utm_source, a.utm_medium, a.utm_campaign, a.utm_content].map((p) => p || '');
  while (parts.length && !parts[parts.length - 1]) parts.pop();
  if (!parts.some(Boolean)) return null;
  return truncate(parts.join('|'), SOURCE_MAX);
}

function cleanClickId(value, min = 8, max = 512) {
  if (typeof value !== 'string') return null;
  if (value.length < min || value.length > max) return null;
  return /^[A-Za-z0-9_-]+$/.test(value) ? value : null; // fbclid est sensible à la casse : jamais modifié
}

// _fbp : fb.<index>.<ms>.<aléatoire>
function cleanFbp(value) {
  return typeof value === 'string' && /^fb\.[0-9]\.[0-9]{10,13}\.[0-9]{4,20}$/.test(value) ? value : null;
}

// _fbc : fb.<index>.<ms>.<fbclid>
function cleanFbc(value) {
  return typeof value === 'string' && /^fb\.[0-9]\.[0-9]{10,13}\.[A-Za-z0-9_-]{8,512}$/.test(value) ? value : null;
}

// _scid (témoin Snap) -> sc_cookie1
function cleanScCookie(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_.-]{8,128}$/.test(value) ? value : null;
}

// Identifiants publicitaires du navigateur. À n'appeler QUE si le consentement a été donné.
//   attribution : { fbclid, fbclid_ts, sccid, ... }   adIds : { fbp, fbc, sc_cookie1 }
function cleanClientIds({ attribution, adIds, now = Date.now() } = {}) {
  const a = attribution && typeof attribution === 'object' ? attribution : {};
  const ids = adIds && typeof adIds === 'object' ? adIds : {};
  const fbclid = cleanClickId(a.fbclid, 10, 512);
  let fbc = cleanFbc(ids.fbc);
  if (!fbc && fbclid) {
    const ts = Number(a.fbclid_ts);
    const plausible = Number.isInteger(ts) && ts > now - 90 * DAY_MS && ts <= now + 60000;
    fbc = `fb.1.${plausible ? ts : now}.${fbclid}`;
  }
  return {
    fbp: cleanFbp(ids.fbp),
    fbc,
    sc_click_id: cleanClickId(a.sccid, 8, 300),
    sc_cookie1: cleanScCookie(ids.sc_cookie1),
  };
}

function cleanIp(ip) {
  const v = typeof ip === 'string' ? ip.trim() : '';
  if (!v || v === '0.0.0.0') return null; // valeur de repli de getIp : pas une vraie adresse
  return net.isIP(v) ? v : null;
}

function cleanUserAgent(ua) {
  if (typeof ua !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const v = ua.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 400);
  return v || null;
}

// Identifiant d'événement partagé pixel <-> serveur (déduplication). Aléatoire, non personnel.
const EVENT_ID_RE = /^[a-z]{1,3}_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function newEventId(prefix = 'p') {
  return `${prefix}_${crypto.randomUUID()}`;
}
function cleanEventId(value) {
  return typeof value === 'string' && EVENT_ID_RE.test(value) ? value : null;
}

module.exports = {
  LABEL_KEYS,
  cleanLabel,
  cleanAttribution,
  composeSource,
  cleanClickId,
  cleanFbp,
  cleanFbc,
  cleanScCookie,
  cleanClientIds,
  cleanIp,
  cleanUserAgent,
  newEventId,
  cleanEventId,
};
