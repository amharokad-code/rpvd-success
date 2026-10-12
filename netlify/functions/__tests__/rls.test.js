'use strict';
// Sécurité transversale : chaque table créée dans le schéma doit avoir la RLS activée, et les tables du
// pivot capsules ne doivent exposer AUCUNE politique publique (accès uniquement via la clé service des
// fonctions Netlify : anon ne lit rien, l'utilisateur ne lit que ce que les fonctions lui renvoient).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const sql = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'supabase_schema.sql'), 'utf8');
const created = [...sql.matchAll(/create table if not exists public\.(\w+)/gi)].map((m) => m[1]);
const rlsOn = new Set([...sql.matchAll(/alter table public\.(\w+)\s+enable row level security/gi)].map((m) => m[1]));

test('toutes les tables du schéma ont la RLS activée', () => {
  const missing = [...new Set(created)].filter((t) => !rlsOn.has(t));
  assert.deepStrictEqual(missing, []);
});

test('les tables capsules n’ont aucune politique publique', () => {
  const pivot = ['capsule_requests', 'capsules', 'bootcamps', 'orders', 'email_events', 'capsule_devices'];
  for (const t of pivot) {
    assert.ok(rlsOn.has(t), `${t} sans RLS`);
    assert.ok(!new RegExp(`create policy[^;]*on public\\.${t}\\b`, 'i').test(sql), `${t} a une politique`);
  }
});

test('la vue de demande n’est pas lisible par anon/authenticated', () => {
  assert.match(sql, /revoke all on public\.capsule_demand from public, anon, authenticated/);
});
