'use strict';
// Désabonnement des courriels d'annonce du Bootcamp (LCAP : simple, gratuit, sans délai).
//   POST JSON { v: <id du vote> } ou { b: <id du billet> }        → depuis la page /desabonner
//   POST ?v=… ou ?b=… (List-Unsubscribe-Post, un clic dans Gmail)  → depuis la boîte de réception
// L'identifiant est un UUID aléatoire : aucun courriel dans l'URL. Les courriels liés à un billet
// payé (confirmation, lien Zoom, remboursement) restent envoyés : ils exécutent le contrat.

const { HttpError, preflight, json, handleError } = require('./_lib/http');
const { getServiceClient } = require('./_lib/supabase');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readIds(event) {
  const q = event.queryStringParameters || {};
  let body = {};
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : event.body || '';
    if (raw.trim().startsWith('{')) body = JSON.parse(raw);
  } catch (_) {
    body = {};
  }
  return { v: body.v || q.v || null, b: body.b || q.b || null };
}

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;

  try {
    const { v, b } = readIds(event);
    const id = v || b;
    if (!UUID.test(String(id || ''))) throw new HttpError(400, 'BAD_REQUEST', 'Lien de désabonnement invalide.');

    const db = getServiceClient();
    const { data, error } = await db.from(v ? 'bootcamp_votes' : 'bootcamp_tickets').select('email').eq('id', id).maybeSingle();
    if (error) throw error;
    // Ligne déjà supprimée (durée de conservation dépassée) : rien à désabonner, réponse identique.
    if (data && data.email) {
      await db.from('bootcamp_unsubscribes').upsert({ email: data.email }, { onConflict: 'email', ignoreDuplicates: true });
    }
    return json(200, { ok: true });
  } catch (err) {
    return handleError(err, 'bootcamp-unsubscribe');
  }
};
