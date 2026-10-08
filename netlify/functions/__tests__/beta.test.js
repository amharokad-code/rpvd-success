'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { isBetaExpired, betaGate, BETA_CREDITS, BETA_WINDOW_HOURS } = require('../_lib/beta');

const H = 3600 * 1000;
const start = Date.parse('2026-10-10T12:00:00Z');

test('config : 20 crédits, fenêtre de 72 h', () => {
  assert.equal(BETA_CREDITS, 20);
  assert.equal(BETA_WINDOW_HOURS, 72);
});

test('isBetaExpired : actif avant 72 h, terminé après', () => {
  const p = { is_beta: true, beta_started_at: new Date(start).toISOString(), plan: 'trial' };
  assert.equal(isBetaExpired(p, start + 71 * H), false);
  assert.equal(isBetaExpired(p, start + 72 * H), true);
  assert.equal(isBetaExpired(p, start + 100 * H), true);
});

test('isBetaExpired : jamais coupé si abonnement payant ou si pas bêta', () => {
  const iso = new Date(start).toISOString();
  assert.equal(isBetaExpired({ is_beta: true, beta_started_at: iso, plan: 'pro' }, start + 200 * H), false);
  assert.equal(isBetaExpired({ is_beta: false, beta_started_at: iso, plan: 'trial' }, start + 200 * H), false);
  assert.equal(isBetaExpired(null, start), false);
});

function fakeDb(user, seen = []) {
  const inserted = [];
  const chain = (table) => ({
    select: () => ({
      eq: (col, val) => ({
        maybeSingle: async () => ({ data: user, error: null }),
        eq: () => ({ limit: async () => ({ data: seen, error: null }) }),
      }),
    }),
    insert: async (row) => { inserted.push({ table, row }); return { error: null }; },
  });
  return { from: chain, inserted };
}

test('betaGate : compte hors bêta → empreinte inchangée, rien journalisé', async () => {
  const db = fakeDb({ is_beta: false, plan: 'free' });
  const r = await betaGate('u1', 'f'.repeat(64), { db });
  assert.equal(r.isBeta, false);
  assert.equal(r.fingerprint, 'f'.repeat(64));
  assert.equal(db.inserted.length, 0);
});

test('betaGate : bêta active → journalise l empreinte neuve et présente l empreinte enregistrée (jamais de blocage)', async () => {
  const db = fakeDb({ is_beta: true, plan: 'trial', beta_started_at: new Date(start).toISOString(), device_fingerprint: 'a'.repeat(64) });
  const r = await betaGate('u1', 'b'.repeat(64), { db, now: start + 10 * H });
  assert.equal(r.isBeta, true);
  assert.equal(r.fingerprint, 'a'.repeat(64));
  assert.equal(db.inserted.length, 1);
  assert.equal(db.inserted[0].table, 'fingerprint_events');
  assert.equal(db.inserted[0].row.fp_hash, 'b'.repeat(64));
});

test('betaGate : empreinte déjà vue → pas de doublon', async () => {
  const db = fakeDb({ is_beta: true, plan: 'trial', beta_started_at: new Date(start).toISOString(), device_fingerprint: null }, [{ id: 1 }]);
  await betaGate('u1', 'c'.repeat(64), { db, now: start + H });
  assert.equal(db.inserted.length, 0);
});

test('betaGate : après 72 h → BETA_ENDED (403)', async () => {
  const db = fakeDb({ is_beta: true, plan: 'trial', beta_started_at: new Date(start).toISOString(), device_fingerprint: null });
  await assert.rejects(() => betaGate('u1', 'd'.repeat(64), { db, now: start + 73 * H }), (e) => e.code === 'BETA_ENDED' && e.status === 403);
});
