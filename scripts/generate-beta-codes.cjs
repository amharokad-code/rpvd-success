#!/usr/bin/env node
'use strict';
// Génère N codes de bêta fermée (défaut 10), les insère dans activation_codes (type 'trial',
// plan 'trial', kind 'beta', BETA_CREDITS crédits chacun) et écrit beta-codes.csv (ignoré par git).
// Les codes sont distribués À LA MAIN : aucun courriel n'est envoyé.
//
// Usage :  node scripts/generate-beta-codes.cjs [N] [jours-pour-activer]
//   N                    nombre de codes (défaut 10, max 50)
//   jours-pour-activer   durée pendant laquelle un code peut être activé (défaut 14)
// Il faut SUPABASE_URL et SUPABASE_SERVICE_KEY dans .env. La clé n'est jamais affichée.
// Prérequis : avoir exécuté supabase_beta_migration.sql (colonne activation_codes.kind).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { createClient } = require('@supabase/supabase-js');
const { BETA_CREDITS } = require('../netlify/functions/_lib/beta');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // même alphabet que les codes RPVD (sans 0/O/1/I)
const group = () => Array.from({ length: 4 }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');
const newCode = () => `RPVD-${group()}-${group()}`;

async function main() {
  const n = Math.min(50, Math.max(1, parseInt(process.argv[2], 10) || 10));
  const days = Math.min(60, Math.max(1, parseInt(process.argv[3], 10) || 14));
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('SUPABASE_URL ou SUPABASE_SERVICE_KEY manquant dans .env');
    process.exit(1);
  }
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const batchId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + days * 86400000).toISOString();

  const codes = new Set();
  while (codes.size < n) codes.add(newCode());
  const rows = [...codes].map((code) => ({
    code, type: 'trial', plan: 'trial', kind: 'beta', credits: BETA_CREDITS, batch_id: batchId, expires_at: expiresAt,
  }));
  const { error } = await db.from('activation_codes').insert(rows);
  if (error) {
    console.error('Insertion impossible :', error.message);
    if (/kind/.test(error.message)) console.error("→ Exécute d'abord supabase_beta_migration.sql dans Supabase > SQL Editor.");
    process.exit(1);
  }
  const csvPath = path.join(__dirname, '..', 'beta-codes.csv');
  const csv = ['code,credits,activer_avant', ...rows.map((r) => `${r.code},${BETA_CREDITS},${expiresAt.slice(0, 10)}`)].join('\n') + '\n';
  fs.writeFileSync(csvPath, csv, 'utf8');
  console.log(`${rows.length} codes créés (${BETA_CREDITS} crédits chacun, à activer avant le ${expiresAt.slice(0, 10)}).`);
  console.log(`Fichier : ${csvPath} (ne pas le versionner ni le partager en bloc).`);
}

main().catch((e) => {
  console.error('Erreur :', e.message);
  process.exit(1);
});
