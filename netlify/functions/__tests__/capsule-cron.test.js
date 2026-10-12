'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { nextKind } = require('../capsule-cron');
const { topicKey, daysUntil } = require('../_lib/capsules');

const now = new Date('2026-10-12T15:00:00Z');
const base = { consent_email: true, unsubscribed_at: null, status: 'open', exam_date: null };

test('topicKey ignore accents et ponctuation', () => {
  assert.strictEqual(topicKey('Équation du 2e degré !'), topicKey('equation du 2e degre'));
});
test('daysUntil compte en jours du Quebec', () => {
  assert.strictEqual(daysUntil('2026-10-15', now), 3);
});
test('pas de courriel sans consentement, desabonne ou achat', () => {
  assert.strictEqual(nextKind({ ...base, consent_email: false }, true, [], now), null);
  assert.strictEqual(nextKind({ ...base, unsubscribed_at: 'x' }, true, [], now), null);
  assert.strictEqual(nextKind({ ...base, status: 'purchased' }, true, [], now), null);
});
test('ready seulement si capsule publiee, une seule fois', () => {
  assert.strictEqual(nextKind(base, false, [], now), null);
  assert.strictEqual(nextKind(base, true, [], now), 'ready');
  assert.strictEqual(nextKind(base, true, ['ready'], now), null);
});
test('j3 a trois jours de la vraie date, j1 seulement si active', () => {
  assert.strictEqual(nextKind({ ...base, exam_date: '2026-10-15' }, true, ['ready'], now), 'j3');
  assert.strictEqual(nextKind({ ...base, exam_date: '2026-10-13' }, true, ['ready'], now, false), 'j3');
  assert.strictEqual(nextKind({ ...base, exam_date: '2026-10-13' }, true, ['ready'], now, true), 'j1');
});
test('rien apres J-1 sauf le suivi post-examen', () => {
  assert.strictEqual(nextKind({ ...base, exam_date: '2026-10-11' }, true, [], now), 'post_exam');
  assert.strictEqual(nextKind({ ...base, exam_date: '2026-10-11' }, true, ['post_exam'], now), null);
  assert.strictEqual(nextKind({ ...base, exam_date: '2026-09-01' }, true, [], now), null);
});
