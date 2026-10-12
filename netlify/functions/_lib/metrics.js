'use strict';
// Mesures d'engagement par capsule (page admin) : démarrage en 24 h, complétion, segment de décrochage,
// taux d'exercices tentés. Fonction pure (testable).

const DAY_MS = 24 * 3600 * 1000;
const pct = (n, d) => (d ? Math.round((n / d) * 100) : null);

function computeMetrics(capsules, segments, orders, progress) {
  return capsules
    .map((cap) => {
      const segs = segments.filter((s) => s.capsule_id === cap.id).sort((a, b) => a.ordre - b.ordre);
      const caps = orders.filter((o) => o.capsule_id === cap.id && o.status !== 'revoked');
      if (segs.length === 0 || caps.length === 0) return null;
      const segIds = new Set(segs.map((s) => s.id));
      const prog = progress.filter((p) => segIds.has(p.segment_id));
      const byOrder = new Map();
      for (const p of prog) byOrder.set(p.order_id, [...(byOrder.get(p.order_id) || []), p]);

      let started24 = 0;
      let finished = 0;
      for (const o of caps) {
        const rows = byOrder.get(o.id) || [];
        if (rows.length && Math.min(...rows.map((r) => Date.parse(r.started_at))) - Date.parse(o.created_at) <= DAY_MS) started24 += 1;
        if (rows.filter((r) => r.complete).length >= segs.length) finished += 1;
      }
      const perSegment = segs.map((s) => {
        const rows = prog.filter((p) => p.segment_id === s.id);
        return { ordre: s.ordre, titre: s.titre, reached: rows.length, completed: rows.filter((r) => r.complete).length, exercises: rows.filter((r) => r.exercice_tente).length };
      });
      // Décrochage : le segment où la perte de complétions d'un segment au suivant est la plus forte.
      let dropAt = null;
      let worst = 0;
      for (let i = 0; i < perSegment.length; i += 1) {
        const prev = i === 0 ? caps.length : perSegment[i - 1].completed;
        const lost = prev - perSegment[i].completed;
        if (lost > worst) { worst = lost; dropAt = perSegment[i].ordre; }
      }
      const totalReached = perSegment.reduce((a, s) => a + s.reached, 0);
      const totalExercises = perSegment.reduce((a, s) => a + s.exercises, 0);
      return {
        slug: cap.slug,
        title: cap.title,
        purchases: caps.length,
        start_24h_pct: pct(started24, caps.length),
        completion_pct: pct(finished, caps.length),
        drop_off_segment: dropAt,
        exercises_tried_pct: pct(totalExercises, totalReached),
        segments: perSegment,
      };
    })
    .filter(Boolean);
}

module.exports = { computeMetrics };
