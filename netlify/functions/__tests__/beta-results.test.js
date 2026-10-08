'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { summarize, verdict, percentile } = require('../_lib/beta-report');

const T0 = '2026-10-10T12:00:00Z';
const later = (h) => new Date(Date.parse(T0) + h * 3600 * 1000).toISOString();
const users = Array.from({ length: 10 }, (_, i) => ({ id: `u${i}`, plan: 'trial', beta_started_at: T0 }));

function dataset({ fichesPer = 2, refaire = 'oui', lat = 4000, err = 0, voters = 8, fpMulti = 0, blocks = 0 } = {}) {
  const subs = users.flatMap((u) => Array.from({ length: fichesPer }, (_, k) => ({ user_id: u.id, created_at: later(1 + k) })));
  const feedback = users.map((u) => ({ user_id: u.id, niveau_debloquant: '2', refaire_seul: refaire, commentaire: null }));
  const votes = users.slice(0, voters).flatMap((u) => [
    { user_id: u.id, poll_key: 'matieres', choices: ['histoire', 'anglais'], autre: null },
    { user_id: u.id, poll_key: 'fonctionnalites', choices: ['clone'], autre: null },
  ]);
  const logs = users.flatMap((u) => [{ user_id: u.id, latency_ms: lat, statut: 'ok', model: 'm1', created_at: later(1) }]).concat(Array.from({ length: err }, () => ({ user_id: 'u0', latency_ms: 1000, statut: 'erreur', model: 'm1', created_at: later(2) })));
  const fpEvents = users.flatMap((u, i) => (i < fpMulti ? [{ user_id: u.id, fp_hash: 'a' }, { user_id: u.id, fp_hash: 'b' }] : [{ user_id: u.id, fp_hash: 'a' }]));
  const securityEvents = Array.from({ length: blocks }, () => ({ user_id: 'u1', kind: 'fingerprint_reverify_required' }));
  return { users, subs, feedback, votes, logs, fpEvents, securityEvents };
}

test('percentile : médiane et p95', () => {
  assert.equal(percentile([1000, 2000, 3000, 4000, 5000], 50), 3000);
  assert.equal(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 100], 95), 100);
  assert.equal(percentile([], 50), null);
});

test('résumé : décomptes agrégés, aucun identifiant de compte en sortie', () => {
  const s = summarize(dataset({ voters: 8, fpMulti: 2 }));
  assert.equal(s.participants, 10);
  assert.equal(s.fiches.deuxEtPlus, 10);
  assert.equal(s.votes.votedBoth, 8);
  assert.equal(s.votes.polls.matieres.options[0].n, 8);
  assert.equal(s.empreintes.comptesAvecDeuxEmpreintesOuPlus, 2);
  assert.equal(s.moteur.medianeMs, 4000);
  assert.doesNotMatch(JSON.stringify(s), /"u\d"/);
});

test('verdict vert : les 5 critères passent', () => {
  const v = verdict(summarize(dataset()));
  assert.equal(v.vert, true);
  assert.equal(v.criteres.length, 5);
  assert.ok(v.criteres.every((c) => c.ok));
});

test('verdict rouge : chaque critère peut échouer', () => {
  assert.equal(verdict(summarize(dataset({ fichesPer: 1 }))).criteres[0].ok, false); // < 80 % à 2 fiches
  assert.equal(verdict(summarize(dataset({ refaire: 'non' }))).criteres[1].ok, false); // < 70 %
  assert.equal(verdict(summarize(dataset({ lat: 7000 }))).criteres[2].ok, false); // médiane > 6 s
  assert.equal(verdict(summarize(dataset({ err: 1 }))).criteres[2].ok, false); // 1 erreur 5xx
  assert.equal(verdict(summarize(dataset({ voters: 6 }))).criteres[3].ok, false); // < 7 votants
  assert.equal(verdict(summarize(dataset({ blocks: 1 }))).criteres[4].ok, false); // un blocage
  assert.equal(verdict(summarize(dataset({ lat: 7000 }))).vert, false);
});

test('« Presque » compte comme réussite pour le critère 2', () => {
  assert.equal(verdict(summarize(dataset({ refaire: 'presque' }))).criteres[1].ok, true);
});

test('beta-results : refuse sans jeton (401) et un non-admin (403), accepte un admin', async () => {
  process.env.ADMIN_EMAILS = 'boss@example.com, autre@example.com';
  const supa = require('../_lib/supabase');
  const fake = (email) => ({
    auth: { getUser: async (tok) => (tok === 'bad' ? { data: null, error: { message: 'x' } } : { data: { user: { email } }, error: null }) },
    from: () => ({ select: () => ({ eq: async () => ({ data: [], error: null }) }) }),
  });
  const run = async (headers, email) => {
    supa.getServiceClient = () => fake(email);
    delete require.cache[require.resolve('../beta-results.js')];
    const { handler } = require('../beta-results.js');
    return handler({ httpMethod: 'POST', headers, body: '{}' });
  };
  assert.equal((await run({}, 'boss@example.com')).statusCode, 401);
  assert.equal((await run({ authorization: 'Bearer bad' }, 'boss@example.com')).statusCode, 401);
  assert.equal((await run({ authorization: 'Bearer ok' }, 'eleve@example.com')).statusCode, 403);
  const ok = await run({ authorization: 'Bearer ok' }, 'BOSS@example.com');
  assert.equal(ok.statusCode, 200);
  assert.equal(JSON.parse(ok.body).summary.participants, 0);
});
