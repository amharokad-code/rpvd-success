'use strict';
// Mini serveur HTTP local (Node pur, sans dépendance) qui exécute les Netlify Functions
// du dossier `netlify/functions` sur http://localhost:8888/.netlify/functions/<name>.
// Usage : `npm run dev:functions` (à côté de `npm run dev` pour le front Vite).

const http = require('http');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const FUNCTIONS_DIR = path.join(ROOT, 'netlify', 'functions');
const PREFIX = '/.netlify/functions/';
const PORT = Number(process.env.FUNCTIONS_PORT) || 8888;

// Charge `.env` puis `.env.local` (les valeurs déjà définies ne sont pas écrasées).
require('dotenv').config({
  path: [path.join(ROOT, '.env'), path.join(ROOT, '.env.local')],
  quiet: true,
});

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

// Lit tout le corps de la requête en chaîne UTF-8.
async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

// Vide le cache `require` du dossier functions pour recharger le code à chaque requête.
function clearFunctionsCache() {
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(FUNCTIONS_DIR)) delete require.cache[key];
  }
}

// Construit un event compatible Lambda/Netlify à partir de la requête Node.
async function buildEvent(req, url) {
  const headers = {};
  for (const [name, value] of Object.entries(req.headers)) {
    headers[name.toLowerCase()] = Array.isArray(value) ? value.join(', ') : value;
  }
  if (!headers['x-nf-client-connection-ip'] && req.socket && req.socket.remoteAddress) {
    headers['x-nf-client-connection-ip'] = req.socket.remoteAddress.replace(/^::ffff:/, '');
  }
  const queryStringParameters = {};
  url.searchParams.forEach((value, key) => {
    queryStringParameters[key] = value;
  });
  return {
    httpMethod: req.method,
    headers,
    body: await readBody(req),
    isBase64Encoded: false,
    path: url.pathname,
    queryStringParameters,
    rawUrl: url.toString(),
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);
  const started = Date.now();

  if (!url.pathname.startsWith(PREFIX)) {
    sendJson(res, 404, { error: 'NOT_FOUND', message: 'Route inconnue.' });
    return;
  }

  const name = url.pathname.slice(PREFIX.length).split('/')[0];
  if (!/^[a-z0-9-]+$/i.test(name)) {
    sendJson(res, 400, { error: 'BAD_REQUEST', message: 'Nom de fonction invalide.' });
    return;
  }

  const file = path.join(FUNCTIONS_DIR, `${name}.js`);
  if (!fs.existsSync(file)) {
    sendJson(res, 404, { error: 'NOT_FOUND', message: `Fonction « ${name} » introuvable.` });
    return;
  }

  try {
    clearFunctionsCache();
    const mod = require(file);
    const handler = mod.handler || (mod.default && mod.default.handler);
    if (typeof handler !== 'function') throw new Error(`${name}.js n'exporte pas de handler`);

    const event = await buildEvent(req, url);
    const result = (await handler(event, {})) || {};
    const status = result.statusCode || 200;
    const headers = {};
    for (const [key, value] of Object.entries(result.headers || {})) {
      if (value !== undefined && value !== null) headers[key] = String(value);
    }
    res.writeHead(status, headers);
    res.end(result.isBase64Encoded ? Buffer.from(result.body || '', 'base64') : result.body || '');
    console.log(`${req.method} ${url.pathname} → ${status} (${Date.now() - started} ms)`);
  } catch (err) {
    console.error(`${req.method} ${url.pathname} → erreur :`, err && err.message ? err.message : err);
    if (!res.headersSent) sendJson(res, 500, { error: 'SERVER_ERROR', message: 'Erreur serveur. Réessaie plus tard.' });
    else res.end();
  }
});

server.listen(PORT, () => {
  console.log(`Netlify Functions (dev) : http://localhost:${PORT}${PREFIX}<name>`);
  console.log(`Dossier : ${FUNCTIONS_DIR}`);
});
