'use strict';
// Évaluation automatique du Moteur D (calcul + raisonnement, couche v3) sur de vraies photos.
//   node scripts/eval-moteur-d.js                → /test-exercices (calcul) puis /test-exercices-raisonnement
//   node scripts/eval-moteur-d.js --check-prompt → vérifie qu'aucun prompt ne contient de backtick ni de ${
// Nom de fichier : <nom>[_qc|_fr|_us|_uk].(jpg|jpeg|png|webp), région QC par défaut.
// Stabilité : deux fichiers <type>__<n>_... (même préfixe avant « __ ») = même type d'exercice, chiffres différents :
// leurs pattern_key doivent être identiques.
// Appelle Gemini directement (aucun crédit, aucune auth) ; la clé vient de .env / .env.local et n'est jamais affichée.

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local'), quiet: true });

const { analyzeImage } = require('../netlify/functions/_lib/gemini');

const ROOT = path.join(__dirname, '..');
const SETS = [
  { dir: 'test-exercices', mode: 'calcul' },
  { dir: 'test-exercices-raisonnement', mode: 'raisonnement' },
];
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const DECIMAL = /\d+(?:[.,]|\{,\})\d+/;
const KEY = /^[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+$/;

if (process.argv.includes('--check-prompt')) {
  let bad = false;
  for (const f of ['moteur-d.js', 'moteur-d-raisonnement.js', 'commun-v3.js']) {
    const src = fs.readFileSync(path.join(ROOT, 'netlify/functions/_prompts', f), 'utf8');
    const body = src.slice(src.indexOf('String.raw`') + 11, src.indexOf('`;', src.indexOf('String.raw`')));
    const ko = body.includes('`') || body.includes('${');
    console.log((ko ? 'ÉCHEC' : 'OK') + ' : ' + f);
    bad = bad || ko;
  }
  process.exit(bad ? 1 : 0);
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

function validate(analysis, metrics, mode) {
  const n = Array.isArray(analysis.niveaux) ? analysis.niveaux : [];
  const three = n.length === 3;
  const c = {};
  c.json = true;
  c.finish = metrics.finishReason !== 'MAX_TOKENS';
  c.trois = three;
  c.key = KEY.test(analysis.pattern_key || '');
  c.decl = Array.isArray(analysis.declencheurs) && analysis.declencheurs.length >= 2 && analysis.declencheurs.length <= 4;
  c.piege = Boolean(analysis.piege);
  c.verif = three && n.every((l) => l.verification);
  c.n1len = three && n[0].demarche.length >= 4 && n[0].demarche.length <= 7;
  c.n3len = three && n[2].demarche.length <= 15;
  if (mode === 'calcul') {
    c.cherche = three && n.every((l) => l.cherche && !l.cherche.includes('='));
    // Niveau 1 : aucune valeur décimale de l'énoncé (celles du connu du niveau 2) ; les constantes (3,6) sont permises.
    const given = three ? n[1].connu.match(new RegExp(DECIMAL.source, 'g')) || [] : [];
    const n1Text = three ? n[0].demarche.map((l) => l.expression).join(' ') + ' ' + n[0].connu : '';
    c.n1 = three && !given.some((d) => n1Text.includes(d));
    c.unites = three && (/math/i.test(analysis.matiere_cible || '') || /\\text\{/.test(JSON.stringify(n[1])));
  }
  return c;
}

async function main() {
  const rows = [];
  const keysByType = new Map();
  for (const { dir, mode } of SETS) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) continue;
    const files = fs.readdirSync(full).filter((f) => MIME[path.extname(f).toLowerCase()]).sort();
    for (const file of files) {
      const region = (/_(qc|fr|us|uk)\.[a-z]+$/i.exec(file) || [, 'qc'])[1].toLowerCase();
      const base64 = fs.readFileSync(path.join(full, file)).toString('base64');
      const started = Date.now();
      try {
        const { analysis, metrics } = await analyzeImage({ base64, mimeType: MIME[path.extname(file).toLowerCase()], region, taskType: 'eval', mode });
        const checks = validate(analysis, metrics, mode);
        rows.push({
          mode,
          fichier: file,
          ok: Object.values(checks).every(Boolean),
          echecs: Object.keys(checks).filter((k) => !checks[k]).join(',') || '-',
          confiance: analysis.confiance,
          cle: analysis.pattern_key,
          ms: metrics.latencyMs,
          modele: metrics.modelUsed,
        });
        if (file.includes('__')) {
          const type = mode + ':' + file.split('__')[0];
          keysByType.set(type, (keysByType.get(type) || []).concat(analysis.pattern_key));
        }
      } catch (err) {
        rows.push({
          mode,
          fichier: file,
          ok: false,
          echecs: `${err.code || 'ERREUR'}: ${String(err.message).slice(0, 50)}`,
          confiance: '-',
          cle: '-',
          ms: Date.now() - started,
          modele: '-',
        });
      }
    }
  }
  if (rows.length === 0) {
    console.error('Aucune image dans test-exercices/ ni test-exercices-raisonnement/.');
    process.exit(2);
  }

  console.table(rows);
  const valid = rows.filter((r) => r.ok).length;
  console.log(`Valides : ${valid}/${rows.length} — latence médiane : ${median(rows.map((r) => r.ms))} ms (objectif < 6000 ms)`);

  const pairs = [...keysByType.entries()].filter(([, keys]) => keys.length >= 2);
  if (pairs.length) {
    const same = pairs.filter(([, keys]) => new Set(keys).size === 1).length;
    for (const [type, keys] of pairs) console.log(`Stabilité ${type} : ${new Set(keys).size === 1 ? 'identique' : 'DIFFÉRENT'} → ${[...new Set(keys)].join(' | ')}`);
    console.log(`pattern_key identique : ${same}/${pairs.length} paires (objectif ≥ 80 %)`);
  } else {
    console.log('Stabilité : aucune paire <type>__1 / <type>__2 trouvée.');
  }
  process.exit(valid === rows.length ? 0 : 1);
}

main();
