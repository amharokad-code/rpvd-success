'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { analyze } = require('../_lib/insights');

const NOW = Date.parse('2026-10-10T12:00:00Z');
const DAY = 86400000;
let t = NOW - 5 * DAY;
const ev = (sid, event_type, extra = {}) => ({ sid, event_type, device: 'mobile', source: 'meta', region: 'qc', props: {}, created_at: new Date((t += 1000)).toISOString(), ...extra });

// 20 visiteurs : 10 cliquent, 4 demandent le lien, 2 arrivent à une fiche.
function journeys() {
  const out = [];
  for (let i = 0; i < 20; i += 1) {
    const sid = `s${String(i).padStart(8, '0')}`;
    out.push(ev(sid, 'pageview'));
    if (i < 10) out.push(ev(sid, 'cta_click'));
    if (i < 4) out.push(ev(sid, 'signup_started'));
    if (i < 2) {
      out.push(ev(sid, 'app_opened'), ev(sid, 'file_selected'), ev(sid, 'analysis_started'), ev(sid, 'analysis_success'));
    }
  }
  return out;
}

test('entonnoir monotone et pire fuite détectée', () => {
  const r = analyze({ events: journeys(), now: NOW, days: 30 });
  const counts = r.funnel.map((s) => s.sessions);
  for (let i = 1; i < counts.length; i += 1) assert.ok(counts[i] <= counts[i - 1], 'monotone');
  assert.equal(counts[0], 20);
  assert.equal(r.funnel.find((s) => s.id === 'cta_click').sessions, 10);
  assert.equal(r.funnel.find((s) => s.id === 'analysis_success').sessions, 2);
  const high = r.diagnostics.find((d) => d.severity === 'high' || d.severity === 'medium');
  assert.ok(high && /Plus grosse fuite/.test(high.title));
});

test('un retour direct sur l’outil (sans page d’accueil) compte dans l’entonnoir', () => {
  const events = [ev('aaaaaaaa1', 'analysis_started'), ev('aaaaaaaa1', 'analysis_success')];
  const r = analyze({ events, now: NOW, days: 30 });
  assert.equal(r.funnel[0].sessions, 1);
  assert.equal(r.funnel.find((s) => s.id === 'analysis_success').sessions, 1);
});

test('derniers événements : où les sessions s’arrêtent', () => {
  const r = analyze({ events: journeys(), now: NOW, days: 30 });
  const top = r.last_events[0];
  assert.equal(top.last_event, 'pageview');
  assert.equal(top.sessions, 10);
});

test('erreurs d’analyse : taux et codes', () => {
  const events = [];
  for (let i = 0; i < 10; i += 1) events.push(ev(`e${i}aaaaaaa`, 'analysis_started'));
  for (let i = 0; i < 3; i += 1) events.push(ev(`e${i}aaaaaaa`, 'analysis_error', { props: { code: 'OCR_FAIL' } }));
  const r = analyze({ events, now: NOW, days: 30 });
  assert.equal(r.errors.analysis_error_rate_pct, 30);
  assert.equal(r.errors.analysis_by_code[0].key, 'OCR_FAIL');
  assert.ok(r.diagnostics.some((d) => /analyses échouent/.test(d.title)));
});

test('moteur : taux, latence et types fragiles', () => {
  const engine = [];
  for (let i = 0; i < 10; i += 1) engine.push({ mode: 'calcul', model: 'm1', latency_ms: 4000 + i * 1000, statut: i < 8 ? 'ok' : 'incomplet', confiance: 'haute', pattern_key: 'chimie/dilution/trouver-volume-initial', finish_reason: 'STOP' });
  const r = analyze({ events: [], engine, now: NOW, days: 30 });
  assert.equal(r.engine.calls, 10);
  assert.equal(r.engine.ok_pct, 80);
  assert.equal(r.engine.incomplet_pct, 20);
  assert.equal(r.engine.worst_patterns[0].bad_pct, 20);
  assert.ok(r.diagnostics.some((d) => /incomplètes/.test(d.title)));
});

test('rétention : activation, abonnés inactifs et partis, sans identité en sortie', () => {
  const users = [];
  const subs = [];
  for (let i = 0; i < 10; i += 1) {
    users.push({ id: `u${i}`, plan: 'free', credits: i < 3 ? 0 : 3, plan_expires_at: null, created_at: new Date(NOW - 10 * DAY).toISOString() });
    if (i < 4) subs.push({ user_id: `u${i}`, created_at: new Date(NOW - 10 * DAY + 3600000).toISOString() });
  }
  users.push({ id: 'p1', plan: 'basic', credits: 10, plan_expires_at: new Date(NOW + 3 * DAY).toISOString(), created_at: new Date(NOW - 60 * DAY).toISOString() });
  users.push({ id: 'p2', plan: 'free', credits: 5, plan_expires_at: new Date(NOW - 2 * DAY).toISOString(), created_at: new Date(NOW - 60 * DAY).toISOString() });
  const r = analyze({ events: [], users, submissions: subs, now: NOW, days: 30 });
  assert.equal(r.retention.paid_total, 1);
  assert.equal(r.retention.paid_inactive_30d_plus, 1);
  assert.equal(r.retention.expiring_7d, 1);
  assert.equal(r.retention.churned_in_window, 1);
  assert.equal(r.retention.free_out_of_credits, 3);
  assert.equal(r.retention.activation_pct, 40);
});

test('aucune donnée : ne plante pas', () => {
  const r = analyze({ now: NOW, days: 7 });
  assert.equal(r.sessions, 0);
  assert.equal(r.funnel.length, 10);
  assert.ok(Array.isArray(r.diagnostics));
});
