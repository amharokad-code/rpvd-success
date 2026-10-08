'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeKey, finalizeFiche, buildAnalysis, isUsableRaw } = require('../_lib/gemini');
const { buildSystemPrompt, COMMUN_V3 } = require('../_prompts/commun-v3');

const level = (n) => ({
  niveau: n,
  connu: 'a, b',
  cherche: 'x',
  schema_ascii: '',
  demarche: [{ expression: '$x$', explication: 'test' }],
  reponse: '$x$',
  principe: 'p',
});
const raw = (extra = {}) => ({ statut: 'ok', message: '', matiere_cible: 'Chimie / Dilution', niveaux: [level(1), level(2), level(3)], cheminement: [], ...extra });

test('normalizeKey : accents, espaces, casse', () => {
  assert.equal(normalizeKey('Chimie/Dilution/Trouver Volume'), 'chimie/dilution/trouver-volume');
  assert.equal(normalizeKey('histoire/causes-conséquences/fait-unique'), 'histoire/causes-consequences/fait-unique');
});

test('normalizeKey : clé invalide → non classé', () => {
  assert.equal(normalizeKey('seulement-un-segment'), 'autre/non-classe/non-classe');
  assert.equal(normalizeKey(''), 'autre/non-classe/non-classe');
});

test('finalizeFiche : champs v3 absents → valeurs douces, jamais d’erreur', () => {
  const f = finalizeFiche({ niveaux: [{}, {}, {}] });
  assert.equal(f.confiance, 'moyenne');
  assert.deepEqual(f.declencheurs, []);
  assert.equal(f.piege, '');
  assert.equal(f.niveaux[0].verification, '');
});

test('finalizeFiche : confiance haute vide a_verifier, déclencheurs bornés à 4', () => {
  const f = finalizeFiche({ confiance: 'haute', a_verifier: 'x', declencheurs: ['a', 'b', 'c', 'd', 'e'], niveaux: [] });
  assert.equal(f.a_verifier, '');
  assert.equal(f.declencheurs.length, 4);
});

test('isUsableRaw : exactement 3 niveaux quand ok', () => {
  assert.equal(isUsableRaw(raw()), true);
  assert.equal(isUsableRaw(raw({ niveaux: [level(1), level(2)] })), false);
  assert.equal(isUsableRaw(raw({ niveaux: [level(1), level(2), level(3), level(3)] })), false);
  assert.equal(isUsableRaw({ statut: 'incomplet', message: 'x' }), true);
});

test('buildAnalysis : ancienne sortie sans champs v3 passe', () => {
  const a = buildAnalysis(raw());
  assert.equal(a.pattern_key, 'autre/non-classe/non-classe');
  assert.equal(a.confiance, 'moyenne');
  assert.equal(a.niveaux.length, 3);
});

test('buildAnalysis : incomplet → OCR_FAIL avec le message du modèle', () => {
  assert.throws(() => buildAnalysis({ statut: 'incomplet', message: 'La valeur de C2 est coupée.' }), (e) => e.code === 'OCR_FAIL' && /C2/.test(e.message));
});

test('buildSystemPrompt : base du mode, puis COMMUN_V3, puis région et notation', () => {
  const calcul = buildSystemPrompt({ mode: 'calcul', region: 'fr', notation: 'x=y' });
  const raison = buildSystemPrompt({ mode: 'raisonnement', region: 'qc' });
  assert.ok(calcul.indexOf('MOTEUR D :') < calcul.indexOf('COUCHE v3'));
  assert.ok(calcul.indexOf('COUCHE v3') < calcul.indexOf('RÉGION DEMANDÉE'));
  assert.ok(calcul.includes('NOTATION PERSONNALISÉE') && calcul.includes('FR'));
  assert.ok(raison.includes('MOTEUR D-R') && !raison.includes('MOTEUR D :'));
});

test('prompts : ni backtick ni ${ dans COMMUN_V3', () => {
  assert.ok(!COMMUN_V3.includes('`') && !COMMUN_V3.includes('${'));
});

test('buildAnalysis : $\text{...}$ pur texte est déballé (mode raisonnement)', () => {
  const r = raw();
  r.niveaux[0].demarche = [{ expression: '$\\text{Quel est le fait ?}$', explication: 'Cherche dans le texte' }];
  assert.equal(buildAnalysis(r).niveaux[0].demarche[0].expression, 'Quel est le fait ?');
});
