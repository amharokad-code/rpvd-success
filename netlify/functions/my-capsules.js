'use strict';
// POST (session Supabase + x-device-fingerprint requis). Accès à vie, 2 appareils par courriel.
//   list                                   → capsules achetées + progression résumée
//   course   { slug }                      → segments, progression, date d'examen, plan suggéré
//   watch    { slug, segment_id? }         → jeton de lecture NEUF (aucune limite de visionnements)
//   progress { slug, segment_id, seconds } → enregistre la progression (complétion à 90 %)
//   attempt  { slug, segment_id }          → « J'ai essayé » : renvoie la correction RPVD
//   parent                                 → vue parent en lecture seule (progression, dates, exercices)
// Loi 25 : un achat n'est utilisable que si l'attestation parentale est enregistrée (orders.parent_attested_at).

const { HttpError, preflight, parseBody, json, header, handleError } = require('./_lib/http');
const { getServiceClient, getFingerprint } = require('./_lib/supabase');
const { authorizeDevice } = require('./_lib/devices');
const { playbackFor } = require('./_lib/playback');
const { publicCapsule, clean, daysUntil } = require('./_lib/capsules');
const { isComplete, planSuggere, summarize } = require('./_lib/engagement');

async function sessionEmail(db, event) {
  const m = /^Bearer\s+(\S+)$/i.exec(String(header(event, 'authorization') || '').trim());
  if (!m) throw new HttpError(401, 'UNAUTHORIZED', 'Connexion requise.');
  const { data, error } = await db.auth.getUser(m[1]);
  const email = data && data.user && String(data.user.email || '').toLowerCase();
  if (error || !email) throw new HttpError(401, 'UNAUTHORIZED', 'Connexion requise.');
  return email;
}

const CAP_FIELDS = 'id,slug,title,type,subject_area,topic,level,price_cad,duration_min,cover_url,description,date_examen,video_url,subtitles_url,published';

async function loadOrders(db, email) {
  const { data, error } = await db
    .from('orders')
    .select(`id, created_at, parent_attested_at, capsule_id, capsules(${CAP_FIELDS})`)
    .eq('email', email)
    .eq('status', 'active')
    .not('capsule_id', 'is', null);
  if (error) throw error;
  return (data || []).filter((o) => o.capsules);
}

async function loadSegments(db, capsuleId, withSecrets = false) {
  const cols = withSecrets ? '*' : 'id,ordre,titre,duree_sec,exercice_enonce';
  const { data, error } = await db.from('capsule_segments').select(cols).eq('capsule_id', capsuleId).order('ordre');
  if (error) throw error;
  return data || [];
}

async function loadProgress(db, orderId) {
  const { data, error } = await db.from('watch_progress').select('*').eq('order_id', orderId);
  if (error) throw error;
  return data || [];
}

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;
  try {
    const db = getServiceClient();
    const email = await sessionEmail(db, event);
    await authorizeDevice(db, email, getFingerprint(event));
    const body = parseBody(event);
    const orders = await loadOrders(db, email);
    const usable = orders.filter((o) => o.parent_attested_at);

    if (body.action === 'list' || !body.action) {
      const items = [];
      for (const o of usable) {
        const segs = await loadSegments(db, o.capsules.id);
        const sum = summarize(segs, await loadProgress(db, o.id));
        items.push({ ...publicCapsule(o.capsules), purchased_at: o.created_at, segments_total: sum.total, segments_completed: sum.completed });
      }
      return json(200, { ok: true, email, capsules: items, blocked: orders.length - usable.length });
    }

    if (body.action === 'parent') {
      const out = [];
      for (const o of usable) {
        const segs = await loadSegments(db, o.capsules.id);
        const prog = await loadProgress(db, o.id);
        const sum = summarize(segs, prog);
        const dates = prog.map((p) => p.updated_at).sort();
        out.push({
          ...publicCapsule(o.capsules),
          date_examen: o.capsules.date_examen,
          purchased_at: o.created_at,
          first_activity: prog.length ? prog.map((p) => p.started_at).sort()[0] : null,
          last_activity: dates.length ? dates[dates.length - 1] : null,
          total: sum.total,
          completed: sum.completed,
          exercises_tried: sum.exercisesTried,
          segments: segs.map((s) => {
            const p = prog.find((x) => x.segment_id === s.id) || {};
            return { ordre: s.ordre, titre: s.titre, complete: Boolean(p.complete), exercice_tente: Boolean(p.exercice_tente) };
          }),
        });
      }
      return json(200, { ok: true, email, capsules: out });
    }

    const slug = clean(body.slug, 80);
    const order = orders.find((o) => o.capsules.slug === slug);
    if (!order) throw new HttpError(403, 'UNAUTHORIZED', "Tu n'as pas accès à cette capsule.");
    if (!order.parent_attested_at) throw new HttpError(403, 'UNAUTHORIZED', 'Le consentement du parent ou tuteur doit être enregistré avant l’accès.');
    const cap = order.capsules;

    if (body.action === 'course') {
      const segs = await loadSegments(db, cap.id);
      const prog = await loadProgress(db, order.id);
      const byId = new Map(prog.map((p) => [p.segment_id, p]));
      const sum = summarize(segs, prog);
      const toExam = cap.date_examen ? daysUntil(cap.date_examen) : null;
      const remaining = segs.filter((s) => !(byId.get(s.id) && byId.get(s.id).complete)).map((s) => s.ordre);
      return json(200, {
        ok: true,
        capsule: publicCapsule(cap),
        date_examen: cap.date_examen,
        days_to_exam: toExam,
        plan: planSuggere(remaining, toExam),
        summary: { total: sum.total, completed: sum.completed, exercises_tried: sum.exercisesTried, next_ordre: sum.next ? sum.next.ordre : null },
        legacy: segs.length === 0,
        segments: segs.map((s) => {
          const p = byId.get(s.id) || {};
          return { ...s, secondes_vues: p.secondes_vues || 0, complete: Boolean(p.complete), exercice_tente: Boolean(p.exercice_tente) };
        }),
      });
    }

    if (body.action === 'watch') {
      const segs = await loadSegments(db, cap.id, true);
      if (segs.length === 0) return json(200, { ok: true, capsule: publicCapsule(cap), ...(await playbackFor(db, cap, email)) });
      const seg = segs.find((s) => s.id === body.segment_id);
      if (!seg) throw new HttpError(400, 'BAD_REQUEST', 'Segment inconnu.');
      return json(200, { ok: true, capsule: publicCapsule(cap), segment_id: seg.id, ...(await playbackFor(db, { video_url: seg.video_id }, email)) });
    }

    if (body.action === 'progress' || body.action === 'attempt') {
      const segs = await loadSegments(db, cap.id, true);
      const seg = segs.find((s) => s.id === body.segment_id);
      if (!seg) throw new HttpError(400, 'BAD_REQUEST', 'Segment inconnu.');
      const { data: existing } = await db.from('watch_progress').select('*').eq('order_id', order.id).eq('segment_id', seg.id).maybeSingle();
      const now = new Date().toISOString();
      const row = existing || { order_id: order.id, segment_id: seg.id, secondes_vues: 0, complete: false, exercice_tente: false, started_at: now };
      if (body.action === 'progress') {
        const seconds = Math.max(0, Math.min(Math.floor(Number(body.seconds) || 0), seg.duree_sec + 5));
        row.secondes_vues = Math.max(row.secondes_vues, seconds);
        row.complete = row.complete || isComplete(row.secondes_vues, seg.duree_sec);
      } else {
        row.exercice_tente = true;
      }
      row.updated_at = now;
      const { error } = await db.from('watch_progress').upsert(row, { onConflict: 'order_id,segment_id' });
      if (error) throw error;
      return json(200, { ok: true, complete: row.complete, correction: body.action === 'attempt' ? seg.exercice_correction_rpvd || '' : undefined });
    }

    throw new HttpError(400, 'BAD_REQUEST', 'Action inconnue.');
  } catch (err) {
    return handleError(err, 'my-capsules');
  }
};
