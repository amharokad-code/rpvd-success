'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { isComplete, planSuggere, summarize, nextEngagementEmail } = require('../_lib/engagement');

const seg = (n) => ({ id: `s${n}`, ordre: n });
const base = { hoursSincePurchase: 30, daysToExam: null, sentKinds: new Set(), lastProgressRef: '', lastProgressAgoDays: 10, hasUpcomingBootcamp: true };

test('complétion à 90 %', () => {
  assert.strictEqual(isComplete(89, 100), false);
  assert.strictEqual(isComplete(90, 100), true);
});

test('plan suggéré : répartit les segments sur les jours restants', () => {
  assert.deepStrictEqual(planSuggere([2, 3, 4, 5], 2), [{ day: 0, ordres: [2, 3] }, { day: 1, ordres: [4, 5] }]);
  assert.deepStrictEqual(planSuggere([2, 3], 5), [{ day: 0, ordres: [2] }, { day: 1, ordres: [3] }]);
  assert.deepStrictEqual(planSuggere([], 3), []);
});

test('J+1 si le segment 1 n’est pas commencé, une seule fois', () => {
  const s = summarize([seg(1), seg(2)], []);
  assert.deepStrictEqual(nextEngagementEmail({ ...base, summary: s }), { kind: 'j1', ref: '' });
  assert.strictEqual(nextEngagementEmail({ ...base, summary: s, sentKinds: new Set(['j1']) }), null);
  assert.strictEqual(nextEngagementEmail({ ...base, summary: s, hoursSincePurchase: 5 }), null);
});

test('progression envoyée quand le nombre de segments terminés change', () => {
  const s = summarize([seg(1), seg(2), seg(3)], [{ segment_id: 's1', complete: true, exercice_tente: true }]);
  assert.deepStrictEqual(nextEngagementEmail({ ...base, summary: s }), { kind: 'progress', ref: '1' });
  assert.strictEqual(nextEngagementEmail({ ...base, summary: s, lastProgressRef: '1' }), null);
});

test('J-3 de la vraie date d’examen si incomplet, jamais après l’examen', () => {
  const s = summarize([seg(1), seg(2)], [{ segment_id: 's1', complete: true }]);
  assert.strictEqual(nextEngagementEmail({ ...base, summary: s, daysToExam: 3, lastProgressRef: '1' }).kind, 'j3');
  assert.strictEqual(nextEngagementEmail({ ...base, summary: s, daysToExam: -1 }), null);
});

test('Bootcamp : invitation à J-5 sous 50 % de complétion, seulement s’il y en a un à venir', () => {
  const s = summarize([seg(1), seg(2), seg(3)], [{ segment_id: 's1', complete: true }]);
  assert.strictEqual(nextEngagementEmail({ ...base, summary: s, daysToExam: 5, lastProgressRef: '1' }).kind, 'bootcamp_invite');
  assert.notStrictEqual((nextEngagementEmail({ ...base, summary: s, daysToExam: 5, lastProgressRef: '1', hasUpcomingBootcamp: false }) || {}).kind, 'bootcamp_invite');
});

test('fin : « capsule terminée » une seule fois', () => {
  const s = summarize([seg(1)], [{ segment_id: 's1', complete: true }]);
  assert.strictEqual(nextEngagementEmail({ ...base, summary: s }).kind, 'done');
  assert.strictEqual(nextEngagementEmail({ ...base, summary: s, sentKinds: new Set(['done']) }), null);
});
