#!/usr/bin/env node
'use strict';
// Vérifie de bout en bout l'intégration Zoom du Bootcamp, avec les VRAIS identifiants (.env) :
//   1. le jeton OAuth (Server-to-Server) est accepté ;
//   2. une réunion test est créée avec les mêmes réglages que la production (inscription obligatoire,
//      aucun courriel Zoom, un seul appareil par lien, caméras coupées, mode focus) ;
//   3. l'adresse donnée en argument y est inscrite -> le lien PERSONNEL est affiché ;
//   4. la réunion test est supprimée (même si une étape échoue).
//
// Usage :  npm run check:zoom -- ton-courriel@exemple.com
//     ou   node scripts/check-zoom.cjs ton-courriel@exemple.com
// Il faut d'abord coller ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID et ZOOM_CLIENT_SECRET dans .env (voir .env.example).
// Le courriel de test reçoit uniquement un lien Zoom (aucun courriel de Zoom n'est envoyé : réglage de la réunion).
// Ne contacte QUE Zoom. Aucun secret n'est affiché.

const path = require('path');

const ROOT = path.join(__dirname, '..');

// Scopes « granulaires » à cocher dans l'application Server-to-Server (Scopes > Add Scopes > Meeting).
// Doc : https://developers.zoom.us/docs/integrations/oauth-scopes-granular/
const REQUIRED_SCOPES = [
  ['meeting:write:meeting:admin', 'créer la réunion de chaque session'],
  ['meeting:write:registrant:admin', 'inscrire chaque élève et obtenir son lien personnel'],
  ['meeting:update:registrant_status:admin', 'annuler l\'inscription lors d\'un remboursement'],
  ['meeting:delete:meeting:admin', 'supprimer la réunion si une session est annulée'],
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function parseArgs(argv) {
  const email = (argv || []).find((a) => !a.startsWith('-')) || '';
  return { email: email.trim().toLowerCase(), valid: EMAIL_PATTERN.test(email.trim()) };
}

// Transforme un message d'erreur technique (celui de netlify/functions/_lib/zoom.js) en explication
// en français avec la marche à suivre. Retourne { cause, steps[] }.
function explainZoomError(message) {
  const msg = String(message || '');
  const lower = msg.toLowerCase();

  if (/does not contain scopes|4711|invalid access token.*scope/.test(lower)) {
    const match = msg.match(/scopes?:\s*\[([^\]]*)\]/i);
    const missing = match ? match[1].split(',').map((s) => s.trim()).filter(Boolean) : REQUIRED_SCOPES.map(([s]) => s);
    return {
      cause: 'Scopes manquants : l\'application Zoom n\'a pas toutes les permissions nécessaires.',
      steps: [
        `Scopes signalés par Zoom : ${missing.join(', ')}`,
        'Dans marketplace.zoom.us > Develop > Build App > ton application > onglet « Scopes » > « Add Scopes » > Meeting :',
        ...REQUIRED_SCOPES.map(([s, why]) => `  - ${s}  (${why})`),
        'Puis onglet « Activation » : « Activate your app » (un changement de scopes se prend en compte après réactivation).',
      ],
    };
  }
  if (/invalid_client|invalid client/.test(lower)) {
    return {
      cause: 'ZOOM_CLIENT_ID ou ZOOM_CLIENT_SECRET refusé par Zoom.',
      steps: [
        'Dans marketplace.zoom.us > ton application > « App Credentials », recopie « Client ID » et « Client Secret » (sans espace, sans guillemets).',
        'Si tu as régénéré le secret, l\'ancien ne fonctionne plus.',
      ],
    };
  }
  if (/invalid account|account_id|invalid_request/.test(lower) && /oauth/.test(lower) && !/activ/.test(lower)) {
    return {
      cause: 'ZOOM_ACCOUNT_ID refusé par Zoom (ou requête OAuth incomplète).',
      steps: ['Dans marketplace.zoom.us > ton application > « App Credentials », recopie « Account ID » dans ZOOM_ACCOUNT_ID.'],
    };
  }
  if (/unsupported_grant_type|account_credentials/.test(lower)) {
    return {
      cause: 'L\'application Zoom n\'est pas de type « Server-to-Server OAuth ».',
      steps: ['Crée une nouvelle application de type « Server-to-Server OAuth » (pas « General », ni l\'ancien « JWT »), puis recopie ses 3 identifiants dans .env.'],
    };
  }
  if (/not activated|inactive|has not been activated|app is not active/.test(lower)) {
    return {
      cause: 'L\'application Zoom n\'est pas activée.',
      steps: ['Dans ton application > onglet « Activation » : « Activate your app ». Complète d\'abord les champs d\'information obligatoires (nom, courriel du contact) si Zoom l\'exige.'],
    };
  }
  if (/user does not exist|\b1001\b/.test(lower)) {
    return {
      cause: 'Zoom ne retrouve pas l\'hôte des réunions (« me » ne désigne pas un utilisateur valide pour cette application).',
      steps: [
        'Ajoute dans .env (et dans Netlify) : ZOOM_HOST_EMAIL=<le courriel exact du compte Zoom qui animera les cours>.',
        'Ce compte doit faire partie du même compte Zoom que l\'application.',
      ],
    };
  }
  if (/pro\b|paid|licensed|license|upgrade|plan|not enabled|not available|3000|200\b.*registration/.test(lower) && /registrant|regist|meeting|http (400|403)/.test(lower)) {
    return {
      cause: 'Le compte Zoom n\'est probablement pas « Pro » (ou l\'hôte n\'a pas de licence payante) : l\'inscription obligatoire et les salles de 90 personnes l\'exigent.',
      steps: [
        'Dans zoom.us > Compte > Facturation : vérifie que le forfait est Pro (ou plus) et que l\'hôte a une licence « Licensed ».',
        'Dans Paramètres > Réunion > Planification : « Inscription » doit être permise pour le compte.',
        'Un compte Basic limite aussi les réunions à 40 minutes : le Bootcamp dure 1 h 30.',
      ],
    };
  }
  if (/http 429|too many requests|rate limit/.test(lower)) {
    return { cause: 'Zoom limite temporairement le nombre de requêtes.', steps: ['Attends une minute et relance la commande.'] };
  }
  if (/http 401|http 403/.test(lower)) {
    return {
      cause: 'Zoom refuse l\'accès (jeton invalide ou permissions insuffisantes).',
      steps: ['Vérifie les 3 identifiants dans .env et que l\'application est activée avec les scopes requis :', ...REQUIRED_SCOPES.map(([s]) => `  - ${s}`)],
    };
  }
  if (/fetch failed|enotfound|econnreset|etimedout|network/.test(lower)) {
    return { cause: 'Connexion à Zoom impossible.', steps: ['Vérifie ta connexion internet (zoom.us et api.zoom.us doivent être joignables), puis relance.'] };
  }
  return {
    cause: 'Erreur Zoom non reconnue.',
    steps: ['Copie le message ci-dessus tel quel : il indique le code d\'erreur Zoom exact (cherche-le sur developers.zoom.us/docs/api/rest/error-definitions).'],
  };
}

function loadEnv() {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(ROOT, '.env'), quiet: true });
  dotenv.config({ path: path.join(ROOT, '.env.local'), quiet: true }); // ne remplace pas une valeur déjà définie
}

function out(line = '') {
  process.stdout.write(`${line}\n`);
}

function printFailure(err) {
  const message = err && err.message ? err.message : String(err);
  const { cause, steps } = explainZoomError(message);
  out('');
  out(`ECHEC : ${cause}`);
  for (const s of steps) out(`  ${s}`);
  out('');
  out(`Message technique : ${message}`);
}

// Étape 1 : jeton OAuth, séparément, pour distinguer un problème d'identifiants d'un problème de scopes.
async function checkToken() {
  const basic = Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64');
  const url = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(process.env.ZOOM_ACCOUNT_ID)}`;
  const res = await fetch(url, { method: 'POST', headers: { Authorization: `Basic ${basic}` } });
  const text = await res.text();
  if (!res.ok) throw new Error(`Zoom OAuth HTTP ${res.status}: ${text.slice(0, 200)}`);
  const data = JSON.parse(text);
  return { expiresIn: data.expires_in, scope: data.scope || '' };
}

async function main(argv) {
  const { email, valid } = parseArgs(argv);
  if (!valid) {
    out('Usage : npm run check:zoom -- ton-courriel@exemple.com');
    out('Le courriel sera inscrit à une réunion test (supprimée ensuite) pour obtenir un lien personnel.');
    return 2;
  }

  loadEnv();
  const missing = ['ZOOM_ACCOUNT_ID', 'ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET'].filter((k) => !process.env[k]);
  if (missing.length) {
    out(`ECHEC : variable(s) manquante(s) dans .env : ${missing.join(', ')}`);
    out('  Dans marketplace.zoom.us > Develop > Build App > « Server-to-Server OAuth » > « App Credentials » :');
    out('  recopie Account ID, Client ID et Client Secret dans .env (modèle : .env.example), puis relance.');
    return 1;
  }

  const zoom = require('../netlify/functions/_lib/zoom');
  let meetingId = null;
  let code = 0;
  try {
    out('1/4 Jeton OAuth ...');
    const tok = await checkToken();
    out(`    OK (valide ${tok.expiresIn || '?'} s)`);
    if (tok.scope) out(`    Scopes accordés : ${tok.scope}`);

    out('2/4 Création d\'une réunion test (dans 7 jours, 90 min) ...');
    const created = await zoom.createMeeting({
      topic: 'TEST RPVD - a supprimer',
      startsAt: new Date(Date.now() + 7 * 86400000),
      durationMin: 90,
    });
    meetingId = created.meetingId;
    out(`    OK, réunion ${meetingId}`);

    out(`3/4 Inscription de ${email} ...`);
    const reg = await zoom.addRegistrant(meetingId, { email, firstName: 'Test', lastName: 'RPVD' });
    if (!reg.joinUrl) throw new Error('Zoom n\'a pas renvoyé de lien personnel (join_url) pour l\'inscrit.');
    out('    OK. Lien PERSONNEL de cet inscrit (à ne pas partager) :');
    out(`    ${reg.joinUrl}`);
    out(`    Identifiant d'inscrit : ${reg.registrantId || '(non fourni)'}`);
  } catch (err) {
    printFailure(err);
    code = 1;
  } finally {
    if (meetingId) {
      out('4/4 Suppression de la réunion test ...');
      try {
        await zoom.deleteMeeting(meetingId);
        out('    OK, réunion supprimée.');
      } catch (err) {
        out(`    ATTENTION : suppression impossible (${err && err.message}). Supprime la réunion ${meetingId} à la main dans zoom.us > Réunions.`);
        if (code === 0) code = 1;
      }
    }
  }

  out('');
  if (code === 0) {
    out('TOUT EST BON : jeton, scopes, création de réunion, inscription et lien personnel fonctionnent.');
    out('Pense aussi à régler les paramètres du compte Zoom (docs/legal/02-ZOOM-PROTECTION-ELEVES.md).');
  } else {
    out('Corrige le point ci-dessus puis relance la commande (elle est sans danger : tout ce qu\'elle crée est supprimé).');
  }
  return code;
}

module.exports = { explainZoomError, parseArgs, REQUIRED_SCOPES };

if (require.main === module) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      printFailure(err);
      process.exit(1);
    },
  );
}
