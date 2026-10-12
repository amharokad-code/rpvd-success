'use strict';
// Lecture protégée d'une capsule : jeton OTP VdoCipher neuf à CHAQUE visionnage (DRM + filigrane
// dynamique : courriel + date), ou URL signée courte (Supabase Storage) en repli. Jamais d'URL brute.

const OTP_TTL_SECONDS = 300;
const SIGNED_SECONDS = 2 * 3600;

async function vdoOtp(videoId, email) {
  const secret = process.env.VDOCIPHER_API_SECRET;
  if (!secret) throw new Error('VDOCIPHER_API_SECRET manquante');
  const date = new Date().toISOString().slice(0, 10);
  const annotate = JSON.stringify([
    { type: 'rtext', text: `${email} · ${date}`, alpha: '0.55', color: '0xFFFFFF', size: '14', interval: '4000' },
    { type: 'text', text: 'RPVD', alpha: '0.35', color: '0xFFFFFF', size: '18', x: '3%', y: '5%' },
  ]);
  const res = await fetch(`https://dev.vdocipher.com/api/videos/${encodeURIComponent(videoId)}/otp`, {
    method: 'POST',
    headers: { Authorization: `Apisecret ${secret}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ttl: OTP_TTL_SECONDS, annotate }),
  });
  if (!res.ok) throw new Error(`VdoCipher HTTP ${res.status}`);
  const { otp, playbackInfo } = await res.json();
  return { otp, playbackInfo };
}

async function playbackFor(db, cap, email) {
  if (String(cap.video_url).startsWith('vdo:')) return { vdo: await vdoOtp(cap.video_url.slice(4), email) };
  const sign = async (path) => {
    const { data, error } = await db.storage.from('capsules').createSignedUrl(path, SIGNED_SECONDS);
    if (error) throw error;
    return data.signedUrl;
  };
  return { video_url: await sign(cap.video_url), subtitles_url: await sign(cap.subtitles_url) };
}

module.exports = { vdoOtp, playbackFor };
