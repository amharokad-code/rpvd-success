'use strict';
// GET/POST /.netlify/functions/ping
// Anti Cold-Start (contrat §6) : la PWA appelle ceci dès que l'élève survole la zone
// d'upload, pour réveiller le pool de conteneurs Netlify AVANT le vrai upload. Le
// handler ne fait rien de coûteux — aucune auth, aucune base de données — juste réveiller
// le runtime Node lui-même. `analyze-homework` reste tout de même verrouillé derrière
// l'auth/fingerprint/rate-limit habituels ; ce ping ne réveille que la couche Functions.
const { preflight, json } = require('./_lib/http');

exports.handler = async (event) => {
  const early = preflight(event, ['GET', 'POST']);
  if (early) return early;
  return json(200, { ok: true, warm: true });
};
