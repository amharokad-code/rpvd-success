'use strict';
// Séances en direct E.M.A. : calendrier, état, validation et origine autorisée.
const test = require('node:test');
const assert = require('node:assert');
const s = require('../_lib/seances');

const seance = { id: 'x', matiere: 'Mathématiques', niveau: 'Sec 4', sujet: 'Équations', startsAt: '2026-11-01T19:00:00-05:00', dureeMin: 60 };

test('la séance du 1er novembre commence à 19 h heure du Québec (00 h UTC le 2)', () => {
  assert.strictEqual(new Date(s.SEANCES[0].startsAt).toISOString(), '2026-11-02T00:00:00.000Z');
});

test('statut : à venir, en cours (salle ouverte 15 min avant), terminée', () => {
  assert.strictEqual(s.statusOf(seance, new Date('2026-11-01T18:30:00-05:00')), 'upcoming');
  assert.strictEqual(s.statusOf(seance, new Date('2026-11-01T18:45:00-05:00')), 'live');
  assert.strictEqual(s.statusOf(seance, new Date('2026-11-01T19:59:00-05:00')), 'live');
  assert.strictEqual(s.statusOf(seance, new Date('2026-11-01T20:01:00-05:00')), 'done');
});

test('publicSeances cache les séances terminées et ne divulgue aucun lien', () => {
  const list = s.publicSeances(new Date('2026-10-30T12:00:00-04:00'), [seance]);
  assert.strictEqual(list.length, 1);
  assert.deepStrictEqual(Object.keys(list[0]).sort(), ['duree_min', 'id', 'matiere', 'niveau', 'starts_at', 'status', 'sujet']);
  assert.strictEqual(s.publicSeances(new Date('2026-11-02T12:00:00-05:00'), [seance]).length, 0);
});

test('prix : 19 $ CAD, facturé tel qu’affiché', () => {
  assert.strictEqual(s.PRICE_CENTS, 1900);
  assert.strictEqual(s.CURRENCY, 'cad');
});

test('courriel et prénom : validation et nettoyage', () => {
  assert.strictEqual(s.cleanEmail('  Eleve@Example.COM '), 'eleve@example.com');
  assert.strictEqual(s.cleanEmail('pas-un-courriel'), null);
  assert.strictEqual(s.cleanName('  <b>Léa</b>  '), 'bLéa/b');
  assert.strictEqual(s.cleanName('x'.repeat(200)).length, 60);
});

test('échappement HTML', () => {
  assert.strictEqual(s.escapeHtml('<script>"&\''), '&lt;script&gt;&quot;&amp;&#39;');
});

test('origine Stripe : seulement les domaines connus, sinon le repli', () => {
  const fb = 'https://rpvdsuccess.com';
  assert.strictEqual(s.originFor({ headers: { host: 'ematutorat.com' } }, fb), 'https://ematutorat.com');
  assert.strictEqual(s.originFor({ headers: { 'x-forwarded-host': 'www.ematutorat.com' } }, fb), 'https://www.ematutorat.com');
  assert.strictEqual(s.originFor({ headers: { host: 'evil.example' } }, fb), fb);
  assert.strictEqual(s.originFor({ headers: {} }, fb), fb);
});

test('findSeance : id inconnu → null', () => {
  assert.strictEqual(s.findSeance('inconnu'), null);
  assert.ok(s.findSeance(s.SEANCES[0].id));
});
