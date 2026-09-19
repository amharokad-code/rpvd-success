'use strict';
// Utilitaires HTTP partagés par toutes les Netlify Functions (réponses JSON,
// erreurs normalisées, CORS, lecture du body, IP cliente, hachage).

const crypto = require('crypto');

// Messages FR courts par code d'erreur (voir contrat §1).
const DEFAULT_MESSAGES = {
  BAD_REQUEST: 'Requête invalide.',
  UNAUTHORIZED: 'Session invalide. Recharge la page.',
  NO_CREDITS: 'Plus de crédits disponibles.',
  FINGERPRINT_MISMATCH: 'Cet accès est lié à un autre appareil.',
  INVALID_CODE: 'Code inconnu. Vérifie les caractères.',
  CODE_USED: 'Ce code a déjà été utilisé.',
  CODE_EXPIRED: 'Ce code est expiré.',
  ALREADY_REQUESTED: 'Des codes ont déjà été envoyés à ce courriel.',
  PAYLOAD_TOO_LARGE: 'Fichier trop gros (max 8 Mo).',
  RATE_LIMITED: 'Trop de tentatives. Réessaie dans un moment.',
  AI_ERROR: "L'analyse a échoué. Ton crédit a été remboursé, réessaie.",
  // Smart Retry : image floue/inexploitable — distinct de AI_ERROR (échec technique) pour
  // que le frontend affiche un message ludique plutôt qu'une erreur générique.
  OCR_FAIL: "Photo pas claire ! Reprends-la avec plus de lumière, ton crédit est remboursé.",
  SERVER_ERROR: 'Erreur serveur. Réessaie plus tard.',
  METHOD_NOT_ALLOWED: 'Méthode non permise.',
};

// Erreur HTTP typée : les handlers la lancent, `handleError` la convertit en réponse.
class HttpError extends Error {
  constructor(status, code, message) {
    super(message || DEFAULT_MESSAGES[code] || 'Erreur.');
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

// Lecture d'un header insensible à la casse (Netlify passe les headers en minuscules,
// mais on reste tolérant pour le serveur de dev).
function header(event, name) {
  const headers = (event && event.headers) || {};
  const wanted = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === wanted) {
      const value = headers[key];
      return Array.isArray(value) ? value[0] : value;
    }
  }
  return undefined;
}

// En-têtes CORS minimaux : même origine en prod (URL Netlify), '*' en dev.
function cors(headers = {}) {
  return {
    'Access-Control-Allow-Origin': process.env.URL || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-device-fingerprint',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
    ...headers,
  };
}

// Réponse JSON (jamais mise en cache).
function json(status, body, headers = {}) {
  return {
    statusCode: status,
    headers: cors({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    }),
    body: JSON.stringify(body),
  };
}

// Réponse d'erreur au format du contrat : { error: CODE, message: FR }.
function error(status, code, message) {
  return json(status, { error: code, message: message || DEFAULT_MESSAGES[code] || 'Erreur.' });
}

// Gère OPTIONS (pré-vol CORS) et refuse toute méthode hors `methods`.
// Retourne une réponse à renvoyer telle quelle, ou null si la requête peut continuer.
function preflight(event, methods = ['POST']) {
  const method = String((event && event.httpMethod) || 'GET').toUpperCase();
  if (method === 'OPTIONS') return { statusCode: 204, headers: cors(), body: '' };
  if (!methods.includes(method)) return error(405, 'METHOD_NOT_ALLOWED');
  return null;
}

// Parse le body JSON (décode base64 si Netlify l'a encodé). Body vide → {}.
function parseBody(event) {
  if (!event || !event.body) return {};
  let raw = event.body;
  if (event.isBase64Encoded) raw = Buffer.from(raw, 'base64').toString('utf8');
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    throw new HttpError(400, 'BAD_REQUEST', 'Corps JSON invalide.');
  }
}

// IP cliente : header Netlify → premier x-forwarded-for → 0.0.0.0.
function getIp(event) {
  const nf = header(event, 'x-nf-client-connection-ip');
  if (nf) return String(nf).trim();
  const xff = header(event, 'x-forwarded-for');
  if (xff) {
    const first = String(xff).split(',')[0].trim();
    if (first) return first;
  }
  return '0.0.0.0';
}

// SHA-256 hexadécimal.
function sha256(str) {
  return crypto.createHash('sha256').update(String(str), 'utf8').digest('hex');
}

// Conversion d'une exception en réponse HTTP. Jamais de stack côté client.
function handleError(err, context = 'function') {
  if (err instanceof HttpError) return error(err.status, err.code, err.message);
  console.error(`[${context}]`, err && err.message ? err.message : err);
  return error(500, 'SERVER_ERROR');
}

module.exports = {
  DEFAULT_MESSAGES,
  HttpError,
  header,
  cors,
  json,
  error,
  preflight,
  parseBody,
  getIp,
  sha256,
  handleError,
};
