'use strict';
// Tarification de lancement : bascule exacte au 1er janvier 2027 00 h (America/Toronto), jamais de prix barré.
const test = require('node:test');
const assert = require('node:assert');
const p = require('../../../src/config/pricing.mjs');
const caps = require('../_lib/capsules');

const before = new Date('2026-12-31T23:59:59-05:00');
const after = new Date('2027-01-01T00:00:00-05:00');

test('prix de lancement jusqu’au 31 décembre 2026 inclusivement', () => {
  assert.strictEqual(p.currentPrice('concept', before), 2400);
  assert.strictEqual(p.currentPrice('exam', before), 3700);
  assert.strictEqual(p.currentPrice('bootcamp', before), 9900);
});

test('prix régulier dès le 1er janvier 2027 à 00 h (Toronto)', () => {
  assert.strictEqual(p.currentPrice('concept', after), 3700);
  assert.strictEqual(p.currentPrice('exam', after), 5000);
});

test('bootcamp : sans prix régulier décidé, le prix reste 99 $', () => {
  assert.strictEqual(p.currentPrice('bootcamp', after), 9900);
});

test('la mention de lancement n’existe qu’avant la fin, avec le prix régulier', () => {
  assert.strictEqual(p.launchNotice('exam', before), "Prix de lancement jusqu'au 31 décembre 2026 — dès le 1er janvier 2027 : 50 $");
  assert.strictEqual(p.launchNotice('exam', after), null);
  assert.strictEqual(p.launchNotice('bootcamp', before), null);
  assert.match(p.launchSummary(before), /Concept 37 \$, Examen 50 \$/);
  assert.strictEqual(p.launchSummary(after), null);
});

test('le serveur lit la même source que le site', () => {
  assert.strictEqual(caps.pricing.currentPrice('exam', before), p.currentPrice('exam', before));
  const pub = caps.publicCapsule({ slug: 'x', title: 't', type: 'exam', price_cad: 2900 });
  assert.strictEqual(pub.price_cad, p.currentPrice('exam')); // la colonne de la base n'est jamais facturée
});
