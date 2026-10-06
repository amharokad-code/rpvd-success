'use strict';
// Décision de consentement et construction des charges utiles de l'API de conversions (Meta + Snap).
// Aucun appel réseau : fetch est toujours un faux.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const AD = require('../_lib/ad-conversions');
const A = require('../_lib/attribution');
const metaCapi = require('../_lib/meta-capi');
const snapCapi = require('../_lib/snap-capi');

const EMAIL = 'Eleve.Test@Exemple.COM';
const EMAIL_HASH = crypto.createHash('sha256').update('eleve.test@exemple.com').digest('hex');
const EVENT_ID = 'p_0b6f6c1e-8d3a-4f6e-9a55-0123456789ab';
const FBP = 'fb.1.1760000000000.1234567890';
const FBC = 'fb.1.1760000000000.IwAR0aBc_dEf-12345';

function quietConsole(t) {
  t.mock.method(console, 'warn', () => {});
  t.mock.method(console, 'error', () => {});
}

function checkout(overrides = {}) {
  return {
    id: 'cs_test_123',
    mode: 'payment',
    payment_status: 'paid',
    amount_total: 2000,
    currency: 'cad',
    customer_details: { email: EMAIL },
    metadata: {
      kind: 'bootcamp',
      session_id: 's1',
      ticket_id: 't1',
      ev: EVENT_ID,
      mk: '1',
      fbp: FBP,
      fbc: FBC,
      sc_click_id: 'AbCdEf12_-xyz',
      sc_cookie1: 'abcdef12-3456',
      client_ip: '203.0.113.7',
      client_ua: 'Mozilla/5.0 (test)',
    },
    ...overrides,
  };
}

function fakeFetch(responder) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url: String(url), body: init && init.body ? JSON.parse(init.body) : null });
    return responder ? responder(url, init) : { ok: true, status: 200, json: async () => ({ events_received: 1, status: 'VALID' }) };
  };
  fn.calls = calls;
  return fn;
}

const ENV = { META_PIXEL_ID: '1234567890', META_CAPI_ACCESS_TOKEN: 'meta-token', SNAP_PIXEL_ID: '0a1b2c3d-1111-2222-3333-444455556666', SNAP_CAPI_TOKEN: 'snap-token', URL: 'https://rpvdsuccess.com' };

test('consentGranted : seulement mk === "1"', () => {
  assert.equal(AD.consentGranted({ mk: '1' }), true);
  for (const bad of [undefined, null, {}, { mk: '0' }, { mk: 1 }, { mk: true }, { mk: 'true' }, { mk: '' }, { marketing_consent: true }]) {
    assert.equal(AD.consentGranted(bad), false, JSON.stringify(bad));
  }
});

test('métadonnées Stripe sans consentement : aucune donnée publicitaire personnelle', () => {
  const md = AD.buildCheckoutMetadata({
    sessionId: 's1',
    ticketId: 't1',
    eventId: EVENT_ID,
    consent: false,
    attribution: { src: 'tiktok', utm_campaign: 'oct_s1' },
    clientIds: { fbp: FBP, fbc: FBC, sc_click_id: 'AbCdEf12_-xyz', sc_cookie1: 'abcdef12-3456' },
    ip: '203.0.113.7',
    userAgent: 'Mozilla/5.0',
  });
  assert.deepEqual(md, { kind: 'bootcamp', session_id: 's1', ticket_id: 't1', ev: EVENT_ID, src: 'tiktok', utm_campaign: 'oct_s1' });
  assert.equal(AD.consentGranted(md), false);
});

test('métadonnées Stripe avec consentement : identifiants, IP et agent inclus, valeurs en texte', () => {
  const md = AD.buildCheckoutMetadata({
    sessionId: 's1',
    ticketId: 't1',
    eventId: EVENT_ID,
    consent: true,
    attribution: { src: 'meta' },
    clientIds: { fbp: FBP, fbc: FBC, sc_click_id: null, sc_cookie1: 'abcdef12-3456' },
    ip: '203.0.113.7',
    userAgent: 'Mozilla/5.0',
  });
  assert.equal(md.mk, '1');
  assert.equal(md.fbp, FBP);
  assert.equal(md.fbc, FBC);
  assert.equal(md.sc_cookie1, 'abcdef12-3456');
  assert.equal(md.client_ip, '203.0.113.7');
  assert.equal(md.client_ua, 'Mozilla/5.0');
  assert.ok(!('sc_click_id' in md), 'valeur absente : clé omise');
  assert.ok(Object.values(md).every((v) => typeof v === 'string' && v.length <= 500));
  assert.ok(Object.keys(md).length <= 50);
  assert.equal(AD.consentGranted(md), true);
});

test('consent doit être exactement true (une valeur « truthy » ne suffit pas)', () => {
  for (const consent of ['true', 1, 'yes', {}, [], 'on']) {
    const md = AD.buildCheckoutMetadata({ sessionId: 's', ticketId: 't', eventId: EVENT_ID, consent, ip: '203.0.113.7' });
    assert.ok(!('mk' in md) && !('client_ip' in md), String(consent));
  }
});

test('buildPurchaseParams : 20 CAD, courriel normalisé, identifiants revalidés', () => {
  const p = AD.buildPurchaseParams(checkout(), 'https://rpvdsuccess.com');
  assert.equal(p.value, 20);
  assert.equal(p.currency, 'CAD');
  assert.equal(p.email, 'eleve.test@exemple.com');
  assert.equal(p.eventId, EVENT_ID);
  assert.equal(p.sourceUrl, 'https://rpvdsuccess.com/merci');
  assert.equal(p.fbp, FBP);
  assert.equal(p.clientIp, '203.0.113.7');

  const tampered = AD.buildPurchaseParams(checkout({ metadata: { kind: 'bootcamp', mk: '1', ev: 'nimporte-quoi', fbp: 'x', client_ip: 'abc' } }), 'https://rpvdsuccess.com');
  assert.equal(tampered.eventId, 'p_cs_test_123', 'repli sur l\'identifiant de session Stripe');
  assert.equal(tampered.fbp, null);
  assert.equal(tampered.clientIp, null);
});

test('payload Meta : Purchase 20 CAD, courriel haché seulement, même event_id', () => {
  const params = AD.buildPurchaseParams(checkout(), 'https://rpvdsuccess.com');
  const payload = metaCapi.buildPurchasePayload({ ...params, eventTime: 1760000123 });
  const ev = payload.data[0];
  assert.equal(ev.event_name, 'Purchase');
  assert.equal(ev.event_id, EVENT_ID);
  assert.equal(ev.event_time, 1760000123);
  assert.equal(ev.action_source, 'website');
  assert.equal(ev.event_source_url, 'https://rpvdsuccess.com/merci');
  assert.deepEqual(ev.user_data.em, [EMAIL_HASH]);
  assert.equal(ev.user_data.fbp, FBP);
  assert.equal(ev.user_data.fbc, FBC);
  assert.equal(ev.user_data.client_ip_address, '203.0.113.7');
  assert.equal(ev.user_data.client_user_agent, 'Mozilla/5.0 (test)');
  assert.equal(ev.custom_data.value, 20);
  assert.equal(ev.custom_data.currency, 'CAD');
  assert.deepEqual(ev.custom_data.content_ids, ['bootcamp-rpvd']);
  const raw = JSON.stringify(payload);
  assert.ok(!raw.toLowerCase().includes('exemple.com'), 'le courriel en clair ne doit jamais partir');
  assert.ok(!('test_event_code' in payload));
  assert.equal(metaCapi.buildPurchasePayload({ ...params, testEventCode: 'TEST123' }).test_event_code, 'TEST123');
});

test('payload Meta sans identifiants : champs omis, pas de valeurs vides', () => {
  const payload = metaCapi.buildPurchasePayload({ value: 20, currency: 'CAD', eventId: EVENT_ID });
  assert.deepEqual(payload.data[0].user_data, {});
  assert.ok(!('event_source_url' in payload.data[0]));
});

test('payload Snap : PURCHASE WEB, event_id partagé, courriel haché, order_id', () => {
  const params = AD.buildPurchaseParams(checkout(), 'https://rpvdsuccess.com');
  const payload = snapCapi.buildPurchasePayload({ ...params, eventTime: 1760000123 });
  const ev = payload.data[0];
  assert.equal(ev.event_name, 'PURCHASE');
  assert.equal(ev.event_id, EVENT_ID);
  assert.equal(ev.event_time, 1760000123);
  assert.equal(ev.action_source, 'WEB');
  assert.equal(ev.event_source_url, 'https://rpvdsuccess.com/merci');
  assert.deepEqual(ev.user_data.em, [EMAIL_HASH]);
  assert.equal(ev.user_data.sc_click_id, 'AbCdEf12_-xyz');
  assert.equal(ev.user_data.sc_cookie1, 'abcdef12-3456');
  assert.equal(ev.user_data.client_ip_address, '203.0.113.7');
  assert.equal(ev.user_data.client_user_agent, 'Mozilla/5.0 (test)');
  assert.equal(ev.custom_data.value, 20);
  assert.equal(ev.custom_data.currency, 'CAD');
  assert.equal(ev.custom_data.order_id, EVENT_ID);
  assert.ok(ev.event_time < 1e11, 'secondes, pas millisecondes');
  assert.ok(!JSON.stringify(payload).toLowerCase().includes('exemple.com'));
});

test('reportBootcampPurchase sans consentement : aucun appel réseau', async (t) => {
  quietConsole(t);
  const f = fakeFetch();
  for (const metadata of [{ kind: 'bootcamp' }, { kind: 'bootcamp', mk: '0' }, { kind: 'bootcamp', marketing_consent: true }, null]) {
    const r = await AD.reportBootcampPurchase(checkout({ metadata }), { fetchImpl: f, env: ENV });
    assert.deepEqual(r, { skipped: 'no_consent' });
  }
  assert.equal(f.calls.length, 0);
});

test('reportBootcampPurchase avec consentement : un envoi Meta et un envoi Snap, même event_id', async (t) => {
  quietConsole(t);
  const f = fakeFetch();
  const r = await AD.reportBootcampPurchase(checkout(), { fetchImpl: f, env: ENV });
  assert.equal(r.meta.sent, true);
  assert.equal(r.snap.sent, true);
  assert.equal(f.calls.length, 2);
  const meta = f.calls.find((c) => c.url.startsWith('https://graph.facebook.com/'));
  const snap = f.calls.find((c) => c.url.startsWith('https://tr.snapchat.com/'));
  assert.match(meta.url, /^https:\/\/graph\.facebook\.com\/v\d+\.\d+\/1234567890\/events\?access_token=meta-token$/);
  assert.match(snap.url, /^https:\/\/tr\.snapchat\.com\/v3\/0a1b2c3d-1111-2222-3333-444455556666\/events\?access_token=snap-token$/);
  assert.equal(meta.body.data[0].event_id, EVENT_ID);
  assert.equal(snap.body.data[0].event_id, EVENT_ID);
  assert.equal(meta.body.data[0].custom_data.value, 20);
  assert.equal(snap.body.data[0].custom_data.value, 20);
});

test('Snap inerte sans SNAP_CAPI_TOKEN, Meta inerte sans jeton : aucune requête', async (t) => {
  quietConsole(t);
  const f = fakeFetch();
  const onlyMeta = await AD.reportBootcampPurchase(checkout(), { fetchImpl: f, env: { ...ENV, SNAP_CAPI_TOKEN: '' } });
  assert.equal(onlyMeta.snap.sent, false);
  assert.equal(onlyMeta.meta.sent, true);
  assert.equal(f.calls.length, 1);
  const none = await AD.reportBootcampPurchase(checkout(), { fetchImpl: f, env: { URL: 'https://rpvdsuccess.com' } });
  assert.equal(none.meta.sent, false);
  assert.equal(none.snap.sent, false);
  assert.equal(f.calls.length, 1, 'aucune nouvelle requête');
});

test('échec réseau ou réponse en erreur : jamais d\'exception (best-effort)', async (t) => {
  quietConsole(t);
  const boom = async () => {
    throw new Error('réseau coupé');
  };
  const r1 = await AD.reportBootcampPurchase(checkout(), { fetchImpl: boom, env: ENV });
  assert.equal(r1.meta.sent, false);
  assert.equal(r1.snap.sent, false);

  const bad = fakeFetch(() => ({ ok: false, status: 400, json: async () => ({ error: { message: 'invalide' }, status: 'INVALID' }) }));
  const r2 = await AD.reportBootcampPurchase(checkout(), { fetchImpl: bad, env: ENV });
  assert.equal(r2.meta.sent, false);
  assert.equal(r2.snap.sent, false);

  const weird = await AD.reportBootcampPurchase(undefined, { fetchImpl: boom, env: ENV });
  assert.deepEqual(weird, { skipped: 'no_consent' });
});

test('META_GRAPH_VERSION : surcharge valide seulement', () => {
  assert.equal(metaCapi.graphVersion({}), 'v25.0');
  assert.equal(metaCapi.graphVersion({ META_GRAPH_VERSION: 'v26.0' }), 'v26.0');
  assert.equal(metaCapi.graphVersion({ META_GRAPH_VERSION: '../evil' }), 'v25.0');
});

test('l\'identifiant d\'événement généré à la réservation est accepté par la validation', () => {
  const id = A.newEventId('p');
  const p = AD.buildPurchaseParams(checkout({ metadata: { mk: '1', ev: id } }), 'https://rpvdsuccess.com');
  assert.equal(p.eventId, id);
});
