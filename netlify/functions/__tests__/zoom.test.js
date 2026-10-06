'use strict';
// Chaîne Zoom du Bootcamp, de bout en bout, SANS réseau : fetch est un faux qui imite l'API Zoom.
//   création de réunion -> inscription d'un billet payé -> lien personnel -> envoi à T-60 min.
// + messages d'erreur en français du script scripts/check-zoom.cjs.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const LIB = path.join(__dirname, '..', '_lib');
const resolve = (f) => require.resolve(path.join(LIB, f));

// Modules qui toucheraient au réseau ou à des secrets : remplacés avant tout require de bootcamp-ops.
const sent = [];
function stub(file, exports) {
  const p = resolve(file);
  require.cache[p] = { id: p, filename: p, loaded: true, exports };
}
stub('email', {
  sendEmail: async () => ({ sent: true }),
  sendBatch: async (messages) => {
    sent.push(...messages);
    return messages.map(() => true);
  },
  bootcampTicketEmail: () => ({ subject: 'billet', html: 'billet' }),
  bootcampZoomLinkEmail: ({ joinUrl, personal }) => ({ subject: 'lien', html: joinUrl, personal }),
  bootcampCancelledEmail: () => ({}),
  bootcampFreedSeatsEmail: () => ({}),
  bootcampFollowupEmail: () => ({}),
  bootcampSelectedEmail: () => ({}),
  bootcampNotSelectedEmail: () => ({}),
});
stub('legal', { unsubscribeLinks: () => null });
stub('stripe-client', {
  getStripe: () => {
    throw new Error('Stripe ne doit pas être appelé dans ce test');
  },
});

function freshZoom() {
  delete require.cache[resolve('zoom')];
  return require('../_lib/zoom');
}

function resp(status, obj) {
  const text = obj === undefined ? '' : JSON.stringify(obj);
  return { ok: status < 400, status, text: async () => text, json: async () => obj };
}

// Faux serveur Zoom : OAuth, création de réunion, inscription, suppression.
function installZoomFetch(t, { registrant = 'ok' } = {}) {
  const log = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    log.push({ url: u, method: init.method, body: init.body ? JSON.parse(init.body) : null });
    if (u.startsWith('https://zoom.us/oauth/token')) return resp(200, { access_token: 'jeton-test', expires_in: 3600 });
    if (init.method === 'POST' && /\/users\/[^/]+\/meetings$/.test(u)) return resp(201, { id: 987654321, join_url: 'https://zoom.us/meeting/register/abc' });
    if (init.method === 'POST' && /\/meetings\/\d+\/registrants$/.test(u)) {
      if (registrant === 'forbidden') return resp(400, { code: 4711, message: 'Invalid access token, does not contain scopes:[meeting:write:registrant:admin].' });
      return resp(201, { registrant_id: 'reg-1', id: 987654321, join_url: 'https://zoom.us/w/987654321?tk=PERSONNEL' });
    }
    if (init.method === 'DELETE') return resp(204);
    return resp(404, { code: 3001, message: 'introuvable' });
  };
  t.after(() => {
    globalThis.fetch = original;
  });
  return log;
}

function withEnv(t, vars) {
  const before = {};
  for (const [k, v] of Object.entries(vars)) {
    before[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  t.after(() => {
    for (const [k, v] of Object.entries(before)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });
}

const ZOOM_ENV = { ZOOM_ACCOUNT_ID: 'acc', ZOOM_CLIENT_ID: 'cid', ZOOM_CLIENT_SECRET: 'sec', ZOOM_HOST_EMAIL: undefined };

test('zoomConfigured : exige les 3 variables', (t) => {
  withEnv(t, { ...ZOOM_ENV, ZOOM_CLIENT_SECRET: undefined });
  assert.equal(freshZoom().zoomConfigured(), false);
  withEnv(t, ZOOM_ENV);
  assert.equal(freshZoom().zoomConfigured(), true);
});

test('createMeeting : inscription obligatoire, aucun courriel Zoom, mineurs protégés, jeton réutilisé', async (t) => {
  withEnv(t, ZOOM_ENV);
  const log = installZoomFetch(t);
  const zoom = freshZoom();
  const m = await zoom.createMeeting({ topic: 'Bootcamp RPVD — Trigonométrie (Sec 5)', startsAt: '2026-10-11T17:00:00.000Z', durationMin: 90 });
  assert.deepEqual(m, { meetingId: '987654321', joinUrl: 'https://zoom.us/meeting/register/abc' });
  const post = log.find((c) => c.method === 'POST' && c.url.endsWith('/users/me/meetings'));
  assert.ok(post, 'POST /users/me/meetings');
  assert.equal(post.body.start_time, '2026-10-11T17:00:00Z');
  assert.equal(post.body.duration, 90);
  const s = post.body.settings;
  assert.equal(s.approval_type, 0, 'inscription automatique (donc obligatoire)');
  assert.equal(s.registrants_email_notification, false);
  assert.equal(s.registrants_confirmation_email, false);
  assert.equal(s.allow_multiple_devices, false, 'un seul appareil par lien');
  assert.equal(s.participant_video, false);
  assert.equal(s.mute_upon_entry, true);
  assert.equal(s.auto_recording, 'none');
  await zoom.addRegistrant('987654321', { email: 'eleve@exemple.com' });
  assert.equal(log.filter((c) => c.url.startsWith('https://zoom.us/oauth/token')).length, 1, 'un seul jeton pour les deux appels');
});

test('addRegistrant : renvoie le lien personnel et l\'identifiant d\'inscrit', async (t) => {
  withEnv(t, ZOOM_ENV);
  const log = installZoomFetch(t);
  const r = await freshZoom().addRegistrant('987654321', { email: 'eleve@exemple.com', firstName: 'Élève', lastName: 'AB12' });
  assert.equal(r.joinUrl, 'https://zoom.us/w/987654321?tk=PERSONNEL');
  assert.equal(r.registrantId, 'reg-1');
  const post = log.find((c) => c.url.endsWith('/meetings/987654321/registrants'));
  assert.deepEqual(post.body, { email: 'eleve@exemple.com', first_name: 'Élève', last_name: 'AB12' });
});

test('ZOOM_HOST_EMAIL remplace « me » dans l\'adresse de création', async (t) => {
  withEnv(t, { ...ZOOM_ENV, ZOOM_HOST_EMAIL: 'hote@exemple.com' });
  const log = installZoomFetch(t);
  await freshZoom().createMeeting({ topic: 'x', startsAt: '2026-10-11T17:00:00Z', durationMin: 90 });
  assert.ok(log.some((c) => c.url.endsWith('/users/hote%40exemple.com/meetings')));
});

test('échec OAuth : le message d\'erreur contient la raison renvoyée par Zoom', async (t) => {
  withEnv(t, ZOOM_ENV);
  const original = globalThis.fetch;
  globalThis.fetch = async () => resp(400, { reason: 'Invalid client_id or client_secret', error: 'invalid_client' });
  t.after(() => {
    globalThis.fetch = original;
  });
  await assert.rejects(() => freshZoom().createMeeting({ topic: 'x', startsAt: '2026-10-11T17:00:00Z', durationMin: 90 }), /Zoom OAuth HTTP 400: .*invalid_client/);
});

// --- Envoi du lien à T-60 min (bootcamp-ops.sendLinks) ------------------------------------------

function freshOps() {
  for (const f of ['zoom', 'bootcamp-ops', 'bootcamp']) delete require.cache[resolve(f)];
  return require('../_lib/bootcamp-ops');
}

// Faux client Supabase : chaîne « thenable » qui répond selon la table et l'opération.
function makeDb(ticket) {
  const writes = [];
  const result = (ctx) => {
    if (ctx.table === 'bootcamp_tickets' && ctx.op === 'select') return { data: [ticket], error: null };
    if (ctx.table === 'bootcamp_tickets' && ctx.op === 'update' && ctx.payload && ctx.payload.zoom_join_url) {
      Object.assign(ticket, ctx.payload);
      return { data: { ...ticket }, error: null };
    }
    return { data: null, error: null };
  };
  return {
    writes,
    from(table) {
      const ctx = { table, op: 'select', payload: null };
      const chain = new Proxy(
        {},
        {
          get(_target, prop) {
            if (prop === 'then') return (ok, ko) => Promise.resolve(result(ctx)).then(ok, ko);
            return (...args) => {
              if (prop === 'update') {
                ctx.op = 'update';
                ctx.payload = args[0];
                writes.push({ table, payload: args[0] });
              }
              return chain;
            };
          },
        },
      );
      return chain;
    },
  };
}

const SESSION = { id: 'sess-1', topic: 'Trigonométrie', starts_at: '2026-10-11T17:00:00.000Z', zoom_meeting_id: '987654321', zoom_join_url: null, manual_join_url: null, week_key: '2026-10-05' };
const newTicket = () => ({ id: 'abcd1234-0000-4000-8000-000000000000', status: 'paid', email: 'eleve@exemple.com', zoom_join_url: null, link_sent_at: null });

test('sendLinks : inscrit le billet payé et envoie son lien PERSONNEL', async (t) => {
  withEnv(t, ZOOM_ENV);
  installZoomFetch(t);
  sent.length = 0;
  const db = makeDb(newTicket());
  const res = await freshOps().sendLinks(db, SESSION);
  assert.equal(res.sent, 1);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'eleve@exemple.com');
  assert.equal(sent[0].html, 'https://zoom.us/w/987654321?tk=PERSONNEL');
  assert.equal(sent[0].personal, true);
  assert.ok(db.writes.some((w) => w.payload.zoom_registrant_id === 'reg-1' && w.payload.zoom_join_url), 'lien personnel enregistré');
  assert.ok(db.writes.some((w) => w.payload.link_sent_at), 'envoi horodaté (pas de double envoi)');
});

test('sendLinks : un billet déjà inscrit n\'est pas réinscrit', async (t) => {
  withEnv(t, ZOOM_ENV);
  const log = installZoomFetch(t);
  sent.length = 0;
  const ticket = { ...newTicket(), zoom_join_url: 'https://zoom.us/w/987654321?tk=DEJA' };
  const res = await freshOps().sendLinks(makeDb(ticket), SESSION);
  assert.equal(res.sent, 1);
  assert.equal(sent[0].html, 'https://zoom.us/w/987654321?tk=DEJA');
  assert.equal(log.filter((c) => /registrants$/.test(c.url)).length, 0);
});

test('sendLinks : Zoom en panne -> repli sur le lien collé dans l\'admin (non personnel)', async (t) => {
  withEnv(t, ZOOM_ENV);
  t.mock.method(console, 'error', () => {});
  installZoomFetch(t, { registrant: 'forbidden' });
  sent.length = 0;
  const res = await freshOps().sendLinks(makeDb(newTicket()), { ...SESSION, manual_join_url: 'https://zoom.us/j/manuel' });
  assert.equal(res.sent, 1);
  assert.equal(sent[0].html, 'https://zoom.us/j/manuel');
  assert.equal(sent[0].personal, false);
});

test('sendLinks : Zoom en panne et aucun lien de repli -> rien d\'envoyé, billet en attente (réessai à la prochaine exécution)', async (t) => {
  withEnv(t, ZOOM_ENV);
  t.mock.method(console, 'error', () => {});
  installZoomFetch(t, { registrant: 'forbidden' });
  sent.length = 0;
  const db = makeDb(newTicket());
  const res = await freshOps().sendLinks(db, SESSION);
  assert.equal(res.sent, 0);
  assert.equal(res.waiting, 1);
  assert.equal(sent.length, 0);
  assert.ok(!db.writes.some((w) => w.payload.link_sent_at));
});

test('calendrier T-60 min : dimanche 13 h -> lien dès 12 h, tâche toutes les 10 min (promesse « 30 à 60 min avant »)', () => {
  const B = freshOps() && require('../_lib/bootcamp');
  assert.equal(B.LINK_LEAD_MIN, 60);
  const start = B.slotStart('2026-10-05', '13:00');
  assert.equal(start.toISOString(), '2026-10-11T17:00:00.000Z', 'dimanche 11 octobre 13 h, heure d\'été de l\'Est');
  const earliest = new Date(start.getTime() - B.LINK_LEAD_MIN * 60000);
  assert.equal(earliest.toISOString(), '2026-10-11T16:00:00.000Z');
  const toml = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'netlify.toml'), 'utf8');
  assert.match(toml, /\[functions\."bootcamp-cron"\]\s*\r?\nschedule = "\*\/10 \* \* \* \*"/);
});

// --- Messages d'erreur du script check-zoom -----------------------------------------------------

const { explainZoomError, parseArgs, REQUIRED_SCOPES } = require('../../../scripts/check-zoom.cjs');
const flat = (x) => `${x.cause}\n${x.steps.join('\n')}`;

test('check-zoom : scopes manquants -> liste les scopes en français', () => {
  const e = explainZoomError('Zoom POST /meetings/1/registrants HTTP 400: {"code":4711,"message":"Invalid access token, does not contain scopes:[meeting:write:registrant:admin]."}');
  assert.match(e.cause, /Scopes manquants/);
  assert.match(flat(e), /meeting:write:registrant:admin/);
  for (const [scope] of REQUIRED_SCOPES) assert.match(flat(e), new RegExp(scope.replace(/:/g, ':')));
});

test('check-zoom : identifiants, compte, type d\'application, activation, hôte, forfait, limite, réseau', () => {
  assert.match(explainZoomError('Zoom OAuth HTTP 400: {"reason":"Invalid client_id or client_secret","error":"invalid_client"}').cause, /ZOOM_CLIENT_ID/);
  assert.match(explainZoomError('Zoom OAuth HTTP 400: {"reason":"Invalid Account Id","error":"invalid_request"}').cause, /ZOOM_ACCOUNT_ID/);
  assert.match(explainZoomError('Zoom OAuth HTTP 400: {"error":"unsupported_grant_type"}').cause, /Server-to-Server/);
  assert.match(explainZoomError('Zoom OAuth HTTP 400: {"reason":"The app is not activated","error":"invalid_request"}').cause, /activée/);
  assert.match(explainZoomError('Zoom POST /users/me/meetings HTTP 404: {"code":1001,"message":"User does not exist: me."}').cause, /hôte/);
  assert.match(flat(explainZoomError('Zoom POST /users/me/meetings HTTP 404: {"code":1001,"message":"User does not exist: me."}')), /ZOOM_HOST_EMAIL/);
  assert.match(explainZoomError('Zoom POST /meetings/1/registrants HTTP 400: {"code":3000,"message":"Registration is only available for Pro or higher accounts"}').cause, /Pro/);
  assert.match(explainZoomError('Zoom POST /users/me/meetings HTTP 429: {"code":429}').cause, /limite/);
  assert.match(explainZoomError('TypeError: fetch failed').cause, /Connexion/);
  assert.match(explainZoomError('quelque chose d\'inattendu').cause, /non reconnue/);
});

test('check-zoom : le courriel de test est obligatoire et validé', () => {
  assert.equal(parseArgs(['eleve@exemple.com']).valid, true);
  assert.equal(parseArgs(['  ELEVE@exemple.com ']).email, 'eleve@exemple.com');
  assert.equal(parseArgs([]).valid, false);
  assert.equal(parseArgs(['pas-un-courriel']).valid, false);
  assert.equal(parseArgs(['--aide']).valid, false);
});
