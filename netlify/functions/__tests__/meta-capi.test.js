'use strict';
const test = require('node:test');
const assert = require('node:assert');

test('sendPurchaseEvent : charge utile Meta (hash du courriel, fbp/fbc, valeur, event_id)', async () => {
  process.env.META_PIXEL_ID = '123';
  process.env.META_CAPI_ACCESS_TOKEN = 'tok';
  let sent;
  global.fetch = async (url, init) => {
    sent = { url, body: JSON.parse(init.body) };
    return { ok: true, json: async () => ({ events_received: 1 }) };
  };
  const { sendPurchaseEvent } = require('../_lib/meta-capi');
  const res = await sendPurchaseEvent({
    email: ' Eleve@Example.com ',
    value: 20,
    currency: 'CAD',
    eventId: 'bootcamp-abc',
    fbp: 'fb.1.1696000000000.111',
    fbc: 'fb.1.1696000000000.AbC',
    sourceUrl: 'https://rpvdsuccess.com/reserver',
    contentName: 'Bootcamp RPVD',
  });
  assert.strictEqual(res.sent, true);
  const ev = sent.body.data[0];
  assert.strictEqual(ev.event_name, 'Purchase');
  assert.strictEqual(ev.event_id, 'bootcamp-abc');
  assert.strictEqual(ev.user_data.em[0], require('crypto').createHash('sha256').update('eleve@example.com').digest('hex'));
  assert.strictEqual(ev.user_data.fbp, 'fb.1.1696000000000.111');
  assert.deepStrictEqual(ev.custom_data, { value: 20, currency: 'CAD', content_name: 'Bootcamp RPVD', content_type: 'product' });
  assert.ok(sent.url.includes('/123/events'));
});

test('sendPurchaseEvent : sans variables Meta, rien n\'est envoyé', async () => {
  delete process.env.META_PIXEL_ID;
  let called = false;
  global.fetch = async () => { called = true; return { ok: true, json: async () => ({}) }; };
  const { sendPurchaseEvent } = require('../_lib/meta-capi');
  const res = await sendPurchaseEvent({ email: 'a@b.co', value: 20, currency: 'CAD', eventId: 'x' });
  assert.strictEqual(res.sent, false);
  assert.strictEqual(called, false);
});
