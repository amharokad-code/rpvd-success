'use strict';
// Bêta fermée : agrégation + verdict automatique (fonctions pures, testables).
// Rien de nominatif : aucun identifiant de compte ni courriel ne sort d'ici, seulement des décomptes.

// Les libellés des options vivent dans src/config/betaVotes.js (source unique, côté client) :
// ici on ne compte que les identifiants ; la page admin les traduit en libellés.
const POLL_KEYS = ['matieres', 'fonctionnalites', 'format'];

const HOUR = 3600 * 1000;

function percentile(values, p) {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const idx = Math.min(v.length - 1, Math.max(0, Math.ceil((p / 100) * v.length) - 1));
  return v[idx];
}

function count(list, keyFn) {
  const out = {};
  for (const x of list) {
    const k = keyFn(x);
    if (k == null) continue;
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

// users : [{id, plan, beta_started_at}] (is_beta = true)
// subs : [{user_id, created_at}] ; feedback : [{user_id, niveau_debloquant, refaire_seul, commentaire}]
// votes : [{user_id, poll_key, choices, autre}] ; logs : [{user_id, latency_ms, statut, model, created_at}]
// fpEvents : [{user_id, fp_hash}] ; securityEvents : [{user_id, kind}]
function summarize({ users, subs, feedback, votes, logs, fpEvents, securityEvents }) {
  const ids = new Set(users.map((u) => u.id));
  const start = Object.fromEntries(users.map((u) => [u.id, new Date(u.beta_started_at).getTime()]));
  const mine = (rows) => rows.filter((r) => ids.has(r.user_id));
  const inWindow = (r) => new Date(r.created_at).getTime() >= start[r.user_id];

  const fichesBy = count(mine(subs).filter(inWindow), (r) => r.user_id);
  const perUser = users.map((u) => fichesBy[u.id] || 0);
  const participants = users.length;
  const active = perUser.filter((n) => n >= 1).length;
  const twoPlus = perUser.filter((n) => n >= 2).length;
  const fichesTotal = perUser.reduce((a, b) => a + b, 0);
  const histogram = count(perUser, (n) => (n >= 5 ? '5+' : String(n)));

  const fb = mine(feedback);
  const niveau = count(fb, (r) => r.niveau_debloquant);
  const refaire = count(fb, (r) => r.refaire_seul);
  const refaireTotal = Object.values(refaire).reduce((a, b) => a + b, 0);
  const refaireOk = (refaire.oui || 0) + (refaire.presque || 0);

  const vs = mine(votes);
  const polls = {};
  for (const key of POLL_KEYS) {
    const rows = vs.filter((v) => v.poll_key === key);
    const byOption = {};
    for (const r of rows) for (const c of Array.isArray(r.choices) ? r.choices : []) byOption[String(c).slice(0, 60)] = (byOption[String(c).slice(0, 60)] || 0) + 1;
    polls[key] = {
      votants: rows.length,
      options: Object.entries(byOption).map(([id, n]) => ({ id, n })).sort((a, b) => b.n - a.n),
      autres: rows.map((r) => (r.autre || '').trim().slice(0, 40)).filter(Boolean), // anonymes, 40 car. max
    };
  }
  const votedBoth = users.filter((u) => vs.some((v) => v.user_id === u.id && v.poll_key === 'matieres') && vs.some((v) => v.user_id === u.id && v.poll_key === 'fonctionnalites')).length;

  const lg = mine(logs).filter(inWindow);
  const lat = lg.filter((l) => l.statut === 'ok').map((l) => l.latency_ms);
  const errors = lg.filter((l) => l.statut === 'erreur').length;
  const byModel = count(lg, (l) => l.model || 'inconnu');

  const fpByUser = {};
  for (const e of mine(fpEvents)) (fpByUser[e.user_id] = fpByUser[e.user_id] || new Set()).add(e.fp_hash);
  const multiFp = Object.values(fpByUser).filter((s) => s.size >= 2).length;
  const blocks = mine(securityEvents).filter((e) => ['fingerprint_reverify_required', 'fingerprint_mismatch'].includes(e.kind)).length;

  return {
    participants,
    active,
    fiches: { total: fichesTotal, parParticipant: participants ? +(fichesTotal / participants).toFixed(1) : 0, histogramme: histogram, deuxEtPlus: twoPlus },
    feedback: { reponses: fb.length, niveau, refaire, refaireTotal, refaireOk, commentaires: fb.filter((r) => r.commentaire).length },
    votes: { polls, votedBoth },
    moteur: { appels: lg.length, medianeMs: percentile(lat, 50), p95Ms: percentile(lat, 95), erreurs5xx: errors, tauxErreur: lg.length ? +(errors / lg.length).toFixed(3) : 0, parModele: byModel },
    empreintes: { comptesAvecDeuxEmpreintesOuPlus: multiFp, blocages: blocks },
  };
}

// Verdict : 5 critères de passage (vert si tous passent).
function verdict(s) {
  const pct = (a, b) => (b ? a / b : 0);
  const criteres = [
    {
      id: 'fiches',
      texte: 'Au moins 80 % des participants ont complété 2 fiches ou plus',
      valeur: `${s.fiches.deuxEtPlus}/${s.participants} (${Math.round(pct(s.fiches.deuxEtPlus, s.participants) * 100)} %)`,
      ok: s.participants > 0 && pct(s.fiches.deuxEtPlus, s.participants) >= 0.8,
    },
    {
      id: 'refaire',
      texte: 'Au moins 70 % répondent « Oui » ou « Presque » à « Pourrais-tu refaire un exercice pareil seul ? »',
      valeur: `${s.feedback.refaireOk}/${s.feedback.refaireTotal} (${Math.round(pct(s.feedback.refaireOk, s.feedback.refaireTotal) * 100)} %)`,
      ok: s.feedback.refaireTotal > 0 && pct(s.feedback.refaireOk, s.feedback.refaireTotal) >= 0.7,
    },
    {
      id: 'moteur',
      texte: 'Latence médiane sous 6 s et 0 erreur 5xx',
      valeur: `médiane ${s.moteur.medianeMs == null ? '—' : (s.moteur.medianeMs / 1000).toFixed(1) + ' s'} · p95 ${s.moteur.p95Ms == null ? '—' : (s.moteur.p95Ms / 1000).toFixed(1) + ' s'} · ${s.moteur.erreurs5xx} erreur(s)`,
      ok: s.moteur.medianeMs != null && s.moteur.medianeMs < 6000 && s.moteur.erreurs5xx === 0,
    },
    {
      id: 'votes',
      texte: 'Au moins 7 participants ont voté aux sondages « matieres » et « fonctionnalites »',
      valeur: `${s.votes.votedBoth} participant(s)`,
      ok: s.votes.votedBoth >= 7,
    },
    {
      id: 'blocages',
      texte: 'Aucun blocage injustifié (empreinte d’appareil)',
      valeur: `${s.empreintes.blocages} blocage(s) · ${s.empreintes.comptesAvecDeuxEmpreintesOuPlus} compte(s) avec 2 empreintes ou plus`,
      ok: s.empreintes.blocages === 0,
    },
  ];
  return { vert: criteres.every((c) => c.ok), criteres };
}

module.exports = { summarize, verdict, percentile, HOUR };
