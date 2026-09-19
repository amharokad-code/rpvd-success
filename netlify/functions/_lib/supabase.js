'use strict';
// Client Supabase « service » (clé secrète, contourne RLS) + helpers d'authentification.
// Le client est instancié paresseusement pour que le `require` ne plante pas sans env.

const { createClient } = require('@supabase/supabase-js');
const { HttpError, header } = require('./http');

let serviceClient = null;

function getServiceClient() {
  if (!serviceClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY manquants');
    serviceClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return serviceClient;
}

// Vérifie le `Authorization: Bearer <access_token>` auprès de GoTrue → { id } ou null.
async function getUserFromRequest(event) {
  const auth = header(event, 'authorization');
  if (!auth) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(String(auth).trim());
  if (!match) return null;
  try {
    const { data, error } = await getServiceClient().auth.getUser(match[1]);
    if (error || !data || !data.user) return null;
    return { id: data.user.id };
  } catch (_) {
    return null;
  }
}

// Empreinte d'appareil : header hex SHA-256 (64 chars) sinon null.
function getFingerprint(event) {
  const raw = header(event, 'x-device-fingerprint');
  if (!raw) return null;
  const value = String(raw).trim().toLowerCase();
  return /^[a-f0-9]{64}$/.test(value) ? value : null;
}

// Statut HTTP associé aux codes levés par les RPC (`RAISE EXCEPTION 'CODE'`).
const RPC_CODE_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NO_CREDITS: 402,
  FINGERPRINT_MISMATCH: 403,
  INVALID_CODE: 404,
  NOT_FOUND: 404,
  CODE_USED: 409,
  CODE_EXPIRED: 410,
};

// Convertit une erreur PostgREST dont le message contient un code du contrat en HttpError.
// On compare sur le premier "token" du message (mot avant espace/':') plutôt que sur une
// inclusion libre, pour éviter un faux positif si un message Postgres contient par hasard
// un de ces mots ailleurs dans le texte.
function rpcErrorToHttp(err) {
  const message = String((err && err.message) || '');
  const token = message.trim().split(/[\s:]/)[0];
  if (RPC_CODE_STATUS[token]) return new HttpError(RPC_CODE_STATUS[token], token);
  return err instanceof Error ? err : new Error(message || 'RPC_ERROR');
}

// Appel RPC avec la clé service ; lance HttpError (code connu) ou Error (inconnu → 500).
async function rpc(name, params) {
  const { data, error } = await getServiceClient().rpc(name, params);
  if (error) throw rpcErrorToHttp(error);
  return data;
}

module.exports = {
  getServiceClient,
  getUserFromRequest,
  getFingerprint,
  rpc,
  rpcErrorToHttp,
  RPC_CODE_STATUS,
};

// Accès pratique `require('./supabase').supabase` (instancié à la première lecture).
Object.defineProperty(module.exports, 'supabase', { enumerable: true, get: getServiceClient });
