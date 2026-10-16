'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { resolveTopicKey } = require('../_lib/topic-cluster');
const { scopedTopicKey } = require('../_lib/capsules');

const base = { subject: 'Mathématiques', level: 'Secondaire 4' };
const known = [{ topic: 'Équations du 2e degré', topic_key: scopedTopicKey(base.subject, base.level, 'Équations du 2e degré') }];
const reply = (match) => async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ match }) }] } }] }) });

test('même sujet à l’accent près : aucune requête à Gemini', async () => {
  let calls = 0;
  const key = await resolveTopicKey({ ...base, topic: 'equations du 2e degre', candidates: known, fetchImpl: async () => { calls += 1; } });
  assert.strictEqual(key, known[0].topic_key);
  assert.strictEqual(calls, 0);
});

test('aucun sujet connu : clé propre, sans Gemini', async () => {
  assert.strictEqual(await resolveTopicKey({ ...base, topic: 'Probabilités', candidates: [], fetchImpl: async () => { throw new Error('non'); } }), scopedTopicKey(base.subject, base.level, 'Probabilités'));
});

test('Gemini rattache un sujet voisin', async () => {
  process.env.GEMINI_API_KEY = 'test';
  const key = await resolveTopicKey({ ...base, topic: 'les équations quadratiques', candidates: known, fetchImpl: reply(0) });
  assert.strictEqual(key, known[0].topic_key);
});

test('Gemini répond null, hors plage ou échoue : clé propre', async () => {
  process.env.GEMINI_API_KEY = 'test';
  const own = scopedTopicKey(base.subject, base.level, 'Trigonométrie');
  for (const fetchImpl of [reply(null), reply(7), reply(-1), async () => { throw new Error('réseau'); }, async () => ({ ok: false })]) {
    assert.strictEqual(await resolveTopicKey({ ...base, topic: 'Trigonométrie', candidates: known, fetchImpl }), own);
  }
});

test('un même sujet n’est pas partagé entre deux niveaux', () => {
  assert.notStrictEqual(scopedTopicKey('Mathématiques', 'Secondaire 3', 'Algèbre'), scopedTopicKey('Mathématiques', 'Secondaire 4', 'Algèbre'));
});
