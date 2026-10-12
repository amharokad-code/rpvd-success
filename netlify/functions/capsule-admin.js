'use strict';
// POST /.netlify/functions/capsule-admin : mini admin des capsules.
// Auth : Authorization: Bearer <jeton Supabase> ET courriel présent dans ADMIN_EMAILS (liste séparée par des virgules).
//   overview                                  → demande par sujet, capsules, commandes, bootcamps
//   upload_url { slug, file: 'video'|'vtt' }  → URL de téléversement signée vers le bucket privé « capsules »
//   save_capsule { ...champs, publish? }      → crée/met à jour ; publier exige vidéo + sous-titres .vtt
//   create_bootcamp { title, topic, starts_at, capacity, meeting_url, chat_url? }

const { HttpError, preflight, parseBody, json, header, handleError } = require('./_lib/http');
const { getServiceClient } = require('./_lib/supabase');
const { PRICES, clean, topicKey } = require('./_lib/capsules');

async function requireAdmin(event) {
  const m = /^Bearer\s+(\S+)$/i.exec(String(header(event, 'authorization') || '').trim());
  if (!m) throw new HttpError(401, 'UNAUTHORIZED', 'Connexion requise.');
  const { data, error } = await getServiceClient().auth.getUser(m[1]);
  const email = data && data.user && String(data.user.email || '').toLowerCase();
  const allowed = String(process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
  if (error || !email || !allowed.includes(email)) throw new HttpError(403, 'UNAUTHORIZED', 'Accès refusé.');
  return email;
}

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;
  try {
    await requireAdmin(event);
    const b = parseBody(event);
    const db = getServiceClient();

    if (b.action === 'overview') {
      const [demand, caps, orders, boots, reqs] = await Promise.all([
        db.from('capsule_demand').select('*'),
        db.from('capsules').select('id,slug,title,type,topic,level,price_cad,published,video_url,subtitles_url,cover_url,created_at').order('created_at', { ascending: false }),
        db.from('orders').select('id,email,product_type,amount,currency,created_at,capsule_id,bootcamp_id').order('created_at', { ascending: false }).limit(200),
        db.from('bootcamps').select('id,title,topic,starts_at,capacity,price_cad,meeting_url,chat_url').order('starts_at', { ascending: false }),
        db.from('capsule_requests').select('id', { count: 'exact', head: true }),
      ]);
      for (const r of [demand, caps, orders, boots]) if (r.error) throw r.error;
      return json(200, { ok: true, demand: demand.data, capsules: caps.data, orders: orders.data, bootcamps: boots.data, total_requests: reqs.count || 0 });
    }

    if (b.action === 'upload_url') {
      const slug = clean(b.slug, 80);
      if (!/^[a-z0-9-]{3,80}$/.test(slug)) throw new HttpError(400, 'BAD_REQUEST', 'Slug invalide.');
      if (b.file === 'cover') {
        const coverPath = `${slug}/cover-${Date.now()}.${b.ext === 'png' ? 'png' : 'jpg'}`;
        const { data, error } = await db.storage.from('capsule-covers').createSignedUploadUrl(coverPath);
        if (error) throw error;
        const publicUrl = db.storage.from('capsule-covers').getPublicUrl(coverPath).data.publicUrl;
        return json(200, { ok: true, path: coverPath, token: data.token, public_url: publicUrl });
      }
      const path = b.file === 'vtt' ? `${slug}/subtitles.vtt` : `${slug}/video.mp4`;
      const { data, error } = await db.storage.from('capsules').createSignedUploadUrl(path, { upsert: true });
      if (error) throw error;
      return json(200, { ok: true, path, token: data.token });
    }

    if (b.action === 'save_capsule') {
      const type = b.type === 'concept' ? 'concept' : 'exam';
      const row = {
        slug: clean(b.slug, 80),
        title: clean(b.title, 160),
        type,
        subject_area: clean(b.subject_area, 60),
        topic: clean(b.topic, 160),
        level: clean(b.level, 40),
        price_cad: Number.isInteger(b.price_cad) && b.price_cad > 0 ? b.price_cad : PRICES[type],
        description: clean(b.description, 1200) || null,
        duration_min: Number.isInteger(b.duration_min) ? b.duration_min : null,
        video_url: clean(b.video_url, 300) || null,
        subtitles_url: clean(b.subtitles_url, 300) || null,
        cover_url: /^https:\/\//.test(clean(b.cover_url, 500)) ? clean(b.cover_url, 500) : null,
      };
      if (!/^[a-z0-9-]{3,80}$/.test(row.slug) || !row.title || !row.topic || !row.level || !row.subject_area) {
        throw new HttpError(400, 'BAD_REQUEST', 'Slug, titre, sujet, niveau et matière sont obligatoires.');
      }
      row.topic_key = topicKey(row.topic);
      if (b.publish === true) {
        if (!row.video_url || !(row.subtitles_url === 'vdocipher:captions' || (row.subtitles_url || '').endsWith('.vtt'))) {
          throw new HttpError(400, 'BAD_REQUEST', 'Publier exige la vidéo et les sous-titres .vtt.');
        }
        row.published = true;
        row.published_at = new Date().toISOString();
      } else if (b.publish === false) {
        row.published = false;
      }
      const { error } = await db.from('capsules').upsert(row, { onConflict: 'slug' });
      if (error) throw error;
      return json(200, { ok: true });
    }

    if (b.action === 'create_bootcamp') {
      const startsAt = new Date(b.starts_at);
      const capacity = Number(b.capacity);
      if (!clean(b.title, 160) || !clean(b.topic, 160) || Number.isNaN(startsAt.getTime()) || !Number.isInteger(capacity) || capacity < 1) {
        throw new HttpError(400, 'BAD_REQUEST', 'Titre, sujet, date et capacité sont obligatoires.');
      }
      const { error } = await db.from('bootcamps').insert({
        title: clean(b.title, 160),
        topic: clean(b.topic, 160),
        starts_at: startsAt.toISOString(),
        capacity,
        meeting_url: clean(b.meeting_url, 500) || null,
        chat_url: clean(b.chat_url, 500) || null,
        price_cad: PRICES.bootcamp,
      });
      if (error) throw error;
      return json(200, { ok: true });
    }

    throw new HttpError(400, 'BAD_REQUEST', 'Action inconnue.');
  } catch (err) {
    return handleError(err, 'capsule-admin');
  }
};
