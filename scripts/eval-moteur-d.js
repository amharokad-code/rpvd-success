'use strict';
// Évaluation automatique du Moteur D (RPVD Visuel v2) sur de vraies photos.
//   node scripts/eval-moteur-d.js            → analyse chaque image de /test-exercices
//   node scripts/eval-moteur-d.js --check-prompt
// Nom de fichier : <nom>[_qc|_fr|_us|_uk].(jpg|jpeg|png|webp)  (région QC par défaut).
// Appelle Gemini directement (aucun crédit, aucune auth) ; la clé vient de .env / .env.local et n'est jamais affichée.

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { analyzeImage } = require('../netlify/functions/_lib/gemini');

const DIR = path.join(__dirname, '..', 'test-exercices');
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const DECIMAL = /\d+(?:[.,]|\{,\})\d+/;

if (process.argv.includes('--check-prompt')) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'netlify/functions/_prompts/moteur-d.js'), 'utf8');
  const body = src.slice(src.indexOf('String.raw`') + 11, src.lastIndexOf('`;'));
  const bad = body.includes('`') || body.includes('${');
  console.log(bad ? 'ÉCHEC : backtick ou ${ dans le prompt' : 'OK : prompt sans backtick ni ${');
  process.exit(bad ? 1 : 0);
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

function validate(analysis, metrics) {
  const checks = {};
  const n = Array.isArray(analysis.niveaux) ? analysis.niveaux : [];
  checks.json = true;
  checks.finish = metrics.finishReason !== 'MAX_TOKENS';
  checks.trois = n.length === 3;
  checks.cherche = n.length === 3 && n.every((l) => l.cherche && !l.cherche.includes('='));
  // Niveau 1 : aucune valeur décimale de l'énoncé (celles du connu du niveau 2) ; les constantes (3,6) sont permises.
  const given = n.length === 3 ? n[1].connu.match(new RegExp(DECIMAL.source, 'g')) || [] : [];
  const n1Text = n.length === 3 ? n[0].demarche.map((l) => l.expression).join(' ') + ' ' + n[0].connu : '';
  checks.n1 = n.length === 3 && !given.some((d) => n1Text.includes(d));
  // Niveau 2 : unités en \text{} (sauf maths pures, souvent sans unités).
  checks.unites = n.length === 3 && (/math/i.test(analysis.matiere_cible || '') || /\\text\{/.test(JSON.stringify(n[1])));
  return checks;
}

async function main() {
  if (!fs.existsSync(DIR)) {
    console.error('Dossier test-exercices/ introuvable : dépose-y des photos (jpg/png/webp).');
    process.exit(2);
  }
  const files = fs.readdirSync(DIR).filter((f) => MIME[path.extname(f).toLowerCase()]).sort();
  if (files.length === 0) {
    console.error('Aucune image dans test-exercices/.');
    process.exit(2);
  }

  const rows = [];
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const region = (/_(qc|fr|us|uk)\.[a-z]+$/i.exec(file) || [, 'qc'])[1].toLowerCase();
    const base64 = fs.readFileSync(path.join(DIR, file)).toString('base64');
    const started = Date.now();
    try {
      const { analysis, metrics } = await analyzeImage({ base64, mimeType: MIME[ext], region, taskType: 'eval' });
      const checks = validate(analysis, metrics);
      rows.push({
        fichier: file,
        region,
        ok: Object.values(checks).every(Boolean),
        echecs: Object.keys(checks).filter((k) => !checks[k]).join(',') || '-',
        ms: metrics.latencyMs,
        modele: metrics.modelUsed,
        tokens: metrics.outputTokens,
      });
    } catch (err) {
      rows.push({
        fichier: file,
        region,
        ok: false,
        echecs: `${err.code || 'ERREUR'}: ${String(err.message).slice(0, 60)}`,
        ms: Date.now() - started,
        modele: '-',
        tokens: 0,
      });
    }
  }

  console.table(rows);
  const valid = rows.filter((r) => r.ok).length;
  console.log(`Valides : ${valid}/${rows.length} — latence médiane : ${median(rows.map((r) => r.ms))} ms (objectif < 6000 ms)`);
  process.exit(valid === rows.length ? 0 : 1);
}

main();
