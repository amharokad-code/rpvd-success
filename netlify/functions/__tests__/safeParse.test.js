'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { safeParseGemini } = require('../_lib/safeParse');

test('JSON propre', () => {
  assert.deepEqual(safeParseGemini('{"a":"$\\\\frac{a}{b}$"}'), { a: '$\\frac{a}{b}$' });
});

test('\\frac simple-échappé (corrompu en \\f) est restauré', () => {
  assert.equal(safeParseGemini('{"a":"$\\frac{a}{b}$"}').a, '$\\frac{a}{b}$');
});

test('\\theta simple-échappé est restauré', () => {
  assert.equal(safeParseGemini('{"a":"$\\theta_1$"}').a, '$\\theta_1$');
});

test('\\beta et \\rho simple-échappés sont restaurés', () => {
  const out = safeParseGemini('{"a":"$\\beta + \\rho$"}').a;
  assert.equal(out, '$\\beta + \\rho$');
});

test('\\( \\) isolés ne font pas planter le parse', () => {
  assert.equal(safeParseGemini('{"a":"\\(x\\)"}').a, '\\(x\\)');
});

test('bloc ```json est retiré', () => {
  assert.deepEqual(safeParseGemini('```json\n{"ok":true}\n```'), { ok: true });
});

test('JSON irrécupérable lance (déclenche le fallback)', () => {
  assert.throws(() => safeParseGemini('{"a": '));
});

test('retours à la ligne du schéma ASCII conservés', () => {
  assert.equal(safeParseGemini('{"s":"a\\nb"}').s, 'a\nb');
});
