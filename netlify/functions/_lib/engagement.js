'use strict';
// Logique pure du suivi d'élève : complétion, plan suggéré, résumé de progression, décision des courriels au parent.
// (src/lib/plan.js reprend planSuggere côté navigateur ; mêmes règles, test de référence dans __tests__.)

const COMPLETE_RATIO = 0.9;

// Un segment est « complété » quand 90 % de sa durée a été vu.
function isComplete(secondsWatched, durationSec) {
  return durationSec > 0 && secondsWatched >= durationSec * COMPLETE_RATIO;
}

// Répartit les segments restants sur les jours d'ici l'examen (aujourd'hui inclus, examen exclu).
// Retourne [{ day: 0..n-1, ordres: [..] }] ; sans date d'examen : un segment par jour.
function planSuggere(remainingOrdres, daysUntilExam) {
  const list = [...remainingOrdres].sort((a, b) => a - b);
  if (list.length === 0) return [];
  const days = daysUntilExam && daysUntilExam > 0 ? Math.min(daysUntilExam, list.length) : list.length;
  const perDay = Math.ceil(list.length / days);
  const plan = [];
  for (let i = 0; i < list.length; i += perDay) plan.push({ day: plan.length, ordres: list.slice(i, i + perDay) });
  return plan;
}

function summarize(segments, progressRows) {
  const byId = new Map(progressRows.map((p) => [p.segment_id, p]));
  const done = segments.filter((s) => byId.get(s.id) && byId.get(s.id).complete);
  const tried = segments.filter((s) => byId.get(s.id) && byId.get(s.id).exercice_tente);
  const started = progressRows.length > 0;
  const next = segments.find((s) => !(byId.get(s.id) && byId.get(s.id).complete)) || null;
  return { total: segments.length, completed: done.length, exercisesTried: tried.length, started, ratio: segments.length ? done.length / segments.length : 0, next };
}

// Quel courriel au parent aujourd'hui ? ctx : { hoursSincePurchase, summary, daysToExam (null si aucune), sentKinds:Set,
// lastProgressRef, lastProgressAgoDays, hasUpcomingBootcamp }. Renvoie { kind, ref } ou null.
function nextEngagementEmail(ctx) {
  const { summary: s, sentKinds, daysToExam } = ctx;
  if (s.total === 0) return null;
  if (s.completed >= s.total) return sentKinds.has('done') ? null : { kind: 'done', ref: '' };
  if (daysToExam !== null && daysToExam < 0) return null; // examen passé : plus de relance
  if (!s.started && ctx.hoursSincePurchase >= 24 && !sentKinds.has('j1')) return { kind: 'j1', ref: '' };
  if (daysToExam !== null && daysToExam >= 4 && daysToExam <= 5 && s.ratio < 0.5 && ctx.hasUpcomingBootcamp && !sentKinds.has('bootcamp_invite')) {
    return { kind: 'bootcamp_invite', ref: '' };
  }
  if (daysToExam !== null && daysToExam >= 2 && daysToExam <= 3 && !sentKinds.has('j3')) return { kind: 'j3', ref: '' };
  if (s.started && s.completed > 0 && String(s.completed) !== ctx.lastProgressRef && ctx.lastProgressAgoDays >= 3) {
    return { kind: 'progress', ref: String(s.completed) };
  }
  return null;
}

module.exports = { COMPLETE_RATIO, isComplete, planSuggere, summarize, nextEngagementEmail };
