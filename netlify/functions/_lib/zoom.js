'use strict';
// Client Zoom (Server-to-Server OAuth) pour le Bootcamp : une réunion avec inscription
// obligatoire par session, un inscrit (= un lien personnel) par billet payé.
// Variables : ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET. Sans elles, tout le reste
// fonctionne et le lien Zoom collé à la main dans l'admin (manual_join_url) prend le relais.

const API = 'https://api.zoom.us/v2';
let cachedToken = null;
let cachedUntil = 0;

function zoomConfigured() {
  return Boolean(process.env.ZOOM_ACCOUNT_ID && process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET);
}

async function token() {
  if (cachedToken && Date.now() < cachedUntil) return cachedToken;
  const basic = Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64');
  const url = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(process.env.ZOOM_ACCOUNT_ID)}`;
  const res = await fetch(url, { method: 'POST', headers: { Authorization: `Basic ${basic}` } });
  if (!res.ok) throw new Error(`Zoom OAuth HTTP ${res.status}`);
  const data = await res.json();
  cachedToken = data.access_token;
  cachedUntil = Date.now() + Math.max(60, (data.expires_in || 3600) - 120) * 1000;
  return cachedToken;
}

async function call(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return {};
  const text = await res.text();
  if (!res.ok) throw new Error(`Zoom ${method} ${path} HTTP ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : {};
}

// Réunion de 90 min, inscription automatique (approval_type 0), aucun courriel Zoom (c'est
// nous qui envoyons le lien personnel 30-60 min avant), un seul appareil par lien.
async function createMeeting({ topic, startsAt, durationMin }) {
  const data = await call('POST', '/users/me/meetings', {
    topic: topic.slice(0, 190),
    type: 2,
    start_time: new Date(startsAt).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    duration: durationMin,
    timezone: 'America/Toronto',
    settings: {
      approval_type: 0,
      registration_type: 1,
      registrants_email_notification: false,
      registrants_confirmation_email: false,
      allow_multiple_devices: false,
      join_before_host: false,
      waiting_room: false,
      mute_upon_entry: true,
      participant_video: false,
      host_video: true,
      meeting_authentication: false,
    },
  });
  return { meetingId: String(data.id), joinUrl: data.join_url || null };
}

async function addRegistrant(meetingId, { email, firstName }) {
  const data = await call('POST', `/meetings/${meetingId}/registrants`, {
    email,
    first_name: (firstName || 'Participant').slice(0, 60),
    last_name: 'RPVD',
  });
  return { registrantId: data.registrant_id || data.id || null, joinUrl: data.join_url || null };
}

async function cancelRegistrant(meetingId, registrantId) {
  await call('PUT', `/meetings/${meetingId}/registrants/status`, {
    action: 'cancel',
    registrants: [{ id: registrantId }],
  });
}

async function deleteMeeting(meetingId) {
  await call('DELETE', `/meetings/${meetingId}`);
}

module.exports = { zoomConfigured, createMeeting, addRegistrant, cancelRegistrant, deleteMeeting };
