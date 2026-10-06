'use strict';
// Validation des paramètres d'attribution reçus du navigateur (netlify/functions/_lib/attribution.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../_lib/attribution');

test('cleanLabel retire les caractères dangereux et garde les accents', () => {
  const hostile = A.cleanLabel('<script>alert("x")</script>');
  assert.ok(hostile && !/[<>()"'/]/.test(hostile), hostile);
  assert.equal(A.cleanLabel('été_2026-oct.s1'), 'été_2026-oct.s1');
  assert.equal(A.cleanLabel('  vidéo   A  '), 'vidéo A');
  assert.equal(A.cleanLabel('a|b'), 'ab', 'le séparateur du champ source est retiré');
});

test('cleanLabel tronque et rejette ce qui est vide ou pas du texte', () => {
  assert.equal(A.cleanLabel('x'.repeat(500), 40).length, 40);
  assert.equal(A.cleanLabel('<>()', 40), null);
  assert.equal(A.cleanLabel('', 40), null);
  assert.equal(A.cleanLabel(null), null);
  assert.equal(A.cleanLabel(12345), null);
  assert.equal(A.cleanLabel({ a: 1 }), null);
});

test('cleanAttribution ne garde que les clés connues et valides', () => {
  const out = A.cleanAttribution({
    src: 'tiktok',
    utm_source: 'ig',
    utm_medium: 'paid',
    utm_campaign: 'oct_s1',
    utm_content: 'video-a',
    utm_term: 'maths',
    fbclid: 'IwAR0abcdefghij',
    email: 'eleve@exemple.com',
    __proto__: { polluted: true },
  });
  assert.deepEqual(out, {
    src: 'tiktok',
    utm_source: 'ig',
    utm_medium: 'paid',
    utm_campaign: 'oct_s1',
    utm_content: 'video-a',
    utm_term: 'maths',
  });
  assert.deepEqual(A.cleanAttribution(null), {});
  assert.deepEqual(A.cleanAttribution(['src']), {});
  assert.deepEqual(A.cleanAttribution('src=tiktok'), {});
});

test('composeSource : positions stables, src prioritaire, 120 caractères max', () => {
  assert.equal(A.composeSource({ src: 'meta', utm_medium: 'paid', utm_campaign: 'oct', utm_content: 'v1' }), 'meta|paid|oct|v1');
  assert.equal(A.composeSource({ utm_source: 'snap', utm_campaign: 'oct' }), 'snap||oct');
  assert.equal(A.composeSource({ src: 'tiktok' }), 'tiktok');
  assert.equal(A.composeSource({ src: 'a', utm_source: 'b' }), 'a');
  assert.equal(A.composeSource({}), null);
  assert.equal(A.composeSource(null), null);
  const long = A.composeSource({ src: 'x'.repeat(40), utm_medium: 'y'.repeat(40), utm_campaign: 'z'.repeat(80), utm_content: 'w'.repeat(80) });
  assert.equal(long.length, 120);
});

test('cleanClickId garde la casse et refuse le reste', () => {
  assert.equal(A.cleanClickId('IwAR0aBc_dEf-12345', 10, 512), 'IwAR0aBc_dEf-12345');
  assert.equal(A.cleanClickId('court', 10, 512), null);
  assert.equal(A.cleanClickId('a b c d e f g h i j', 10, 512), null);
  assert.equal(A.cleanClickId('x'.repeat(600), 10, 512), null);
  assert.equal(A.cleanClickId('abc<script>def', 8, 512), null);
  assert.equal(A.cleanClickId(undefined, 8, 512), null);
});

test('formats fbp, fbc et _scid', () => {
  assert.equal(A.cleanFbp('fb.1.1760000000000.1234567890'), 'fb.1.1760000000000.1234567890');
  assert.equal(A.cleanFbp('fb.1.abc.123'), null);
  assert.equal(A.cleanFbp("fb.1.1760000000000.1'; drop table"), null);
  assert.equal(A.cleanFbc('fb.1.1760000000000.IwAR0aBc_dEf-12345'), 'fb.1.1760000000000.IwAR0aBc_dEf-12345');
  assert.equal(A.cleanFbc('fb.1.1760000000000.court'), null);
  assert.equal(A.cleanScCookie('1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d'), '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d');
  assert.equal(A.cleanScCookie('x y'), null);
});

test('cleanClientIds : fbc explicite prioritaire, sinon dérivé du fbclid', () => {
  const now = 1760000000000;
  const explicit = A.cleanClientIds({
    attribution: { fbclid: 'IwAR0aBc_dEf-12345', fbclid_ts: now - 1000 },
    adIds: { fbc: 'fb.1.1759999999999.AbCdEfGh12345', fbp: 'fb.1.1759999999999.1234567890' },
    now,
  });
  assert.equal(explicit.fbc, 'fb.1.1759999999999.AbCdEfGh12345');
  assert.equal(explicit.fbp, 'fb.1.1759999999999.1234567890');

  const derived = A.cleanClientIds({ attribution: { fbclid: 'IwAR0aBc_dEf-12345', fbclid_ts: now - 5000 }, adIds: {}, now });
  assert.equal(derived.fbc, `fb.1.${now - 5000}.IwAR0aBc_dEf-12345`);

  const badTs = A.cleanClientIds({ attribution: { fbclid: 'IwAR0aBc_dEf-12345', fbclid_ts: 12 }, adIds: {}, now });
  assert.equal(badTs.fbc, `fb.1.${now}.IwAR0aBc_dEf-12345`, 'horodatage invraisemblable : on utilise maintenant');

  const empty = A.cleanClientIds({ attribution: { fbclid: '<x>' }, adIds: { fbp: 'nimporte quoi', sc_cookie1: '!!' }, now });
  assert.deepEqual(empty, { fbp: null, fbc: null, sc_click_id: null, sc_cookie1: null });

  const snap = A.cleanClientIds({ attribution: { sccid: 'AbCdEf12_-xyz' }, adIds: { sc_cookie1: 'abcdef12-3456' }, now });
  assert.equal(snap.sc_click_id, 'AbCdEf12_-xyz');
  assert.equal(snap.sc_cookie1, 'abcdef12-3456');

  assert.deepEqual(A.cleanClientIds(), { fbp: null, fbc: null, sc_click_id: null, sc_cookie1: null });
});

test('cleanIp et cleanUserAgent', () => {
  assert.equal(A.cleanIp('203.0.113.7'), '203.0.113.7');
  assert.equal(A.cleanIp(' 2001:db8::1 '), '2001:db8::1');
  assert.equal(A.cleanIp('0.0.0.0'), null, 'valeur de repli de getIp');
  assert.equal(A.cleanIp('pas une ip'), null);
  assert.equal(A.cleanIp(undefined), null);
  assert.equal(A.cleanUserAgent('Mozilla/5.0\r\nX-Injected: 1'), 'Mozilla/5.0X-Injected: 1');
  assert.equal(A.cleanUserAgent('a'.repeat(1000)).length, 400);
  assert.equal(A.cleanUserAgent(''), null);
  assert.equal(A.cleanUserAgent(42), null);
});

test('identifiants d\'événement : générés valides, valeurs externes refusées', () => {
  const id = A.newEventId('p');
  assert.match(id, /^p_[0-9a-f-]{36}$/);
  assert.equal(A.cleanEventId(id), id);
  assert.equal(A.cleanEventId('p_123'), null);
  assert.equal(A.cleanEventId('<script>'), null);
  assert.equal(A.cleanEventId(undefined), null);
  assert.notEqual(A.newEventId('p'), A.newEventId('p'));
});
