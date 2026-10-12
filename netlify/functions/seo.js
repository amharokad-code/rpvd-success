'use strict';
// Pré-rendu des pages publiques pour les robots (moteurs de recherche et IA) : le HTML construit par Vite
// (index.html) est renvoyé avec le contenu réel de la page dans #root, les balises meta et le JSON-LD.
// React remplace ce contenu au chargement pour les humains. Aucune vidéo, aucune démarche : titre, niveau,
// matière, description, prix. Routes (netlify.toml) : /sitemap.xml, /capsules, /capsules/:slug, /demande.

const { getServiceClient } = require('./_lib/supabase');
const { siteUrl } = require('./_lib/legal');
const { escapeHtml } = require('./_lib/email');

const money = (cents) => `${(cents / 100).toFixed(0)} $`;
const e = escapeHtml;

function layoutShell(html, { title, description, canonical, jsonld, body }) {
  let out = html;
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${e(title)}</title>`);
  out = out.replace(/<meta\s+name="description"[\s\S]*?\/>/, `<meta name="description" content="${e(description)}" />`);
  out = out.replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${e(canonical)}" />`);
  out = out.replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${e(title)}" />`);
  out = out.replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${e(canonical)}" />`);
  const ld = jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : '';
  out = out.replace('</head>', `${ld}</head>`);
  return out.replace(/<!--ssr-->[\s\S]*?<!--\/ssr-->/, () => body);
}

async function baseHtml() {
  const res = await fetch(`${siteUrl()}/index.html`);
  if (!res.ok) throw new Error(`index.html introuvable (${res.status})`);
  return res.text();
}

function page(statusCode, html, extra = {}) {
  return { statusCode, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300', ...extra }, body: html };
}

exports.handler = async (event) => {
  try {
    const q = event.queryStringParameters || {};
    const db = getServiceClient();
    const base = siteUrl();

    if (q.p === 'sitemap') {
      const { data } = await db.from('capsules').select('slug,published_at').eq('published', true);
      const urls = [
        [`${base}/`, null],
        [`${base}/capsules`, null],
        [`${base}/demande`, null],
        ...(data || []).map((c) => [`${base}/capsules/${c.slug}`, c.published_at]),
      ];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
        .map(([loc, mod]) => `  <url><loc>${e(loc)}</loc>${mod ? `<lastmod>${new Date(mod).toISOString().slice(0, 10)}</lastmod>` : ''}</url>`)
        .join('\n')}\n</urlset>`;
      return { statusCode: 200, headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }, body: xml };
    }

    const html = await baseHtml();

    if (q.slug) {
      const { data: cap } = await db.from('capsules').select('slug,title,type,subject_area,topic,level,price_cad,duration_min,description,cover_url,published_at').eq('slug', q.slug).eq('published', true).maybeSingle();
      if (!cap) return page(404, layoutShell(html, { title: 'Capsule introuvable — RPVD', description: 'Cette capsule n’existe pas.', canonical: `${base}/capsules`, body: '<p>Capsule introuvable. <a href="/capsules">Voir les capsules</a></p>' }));
      const url = `${base}/capsules/${cap.slug}`;
      const description = cap.description || `Capsule vidéo sous-titrée RPVD : ${cap.topic} (${cap.level}, ${cap.subject_area}). Une marche à suivre réutilisable pour tous les numéros du même type.`;
      const jsonld = {
        '@context': 'https://schema.org',
        '@type': 'Course',
        name: cap.title,
        description,
        url,
        inLanguage: 'fr-CA',
        educationalLevel: cap.level,
        teaches: cap.topic,
        ...(cap.cover_url ? { image: cap.cover_url } : {}),
        provider: { '@type': 'Organization', name: 'RPVD', url: base },
        offers: { '@type': 'Offer', price: (cap.price_cad / 100).toFixed(2), priceCurrency: 'CAD', availability: 'https://schema.org/InStock', url },
      };
      const body = `<main style="max-width:720px;margin:0 auto;padding:24px;font-family:sans-serif"><nav><a href="/capsules">Capsules</a></nav>
<h1>${e(cap.title)}</h1><p>${e(cap.level)} · ${e(cap.subject_area)}${cap.duration_min ? ` · ${cap.duration_min} min` : ''}</p>
<p>${e(description)}</p><p><strong>${money(cap.price_cad)} CAD</strong>, paiement unique. Vidéo sous-titrée, accès à vie.</p></main>`;
      return page(200, layoutShell(html, { title: `${cap.title} — Capsule RPVD`, description, canonical: url, jsonld, body }));
    }

    if (q.p === 'demande') {
      const body = '<main style="max-width:720px;margin:0 auto;padding:24px;font-family:sans-serif"><h1>Demander une capsule</h1><p>Dis-nous la matière, le niveau et le sujet de l’examen. Dès que trois familles demandent le même sujet, on produit la capsule sous-titrée et on t’écrit.</p></main>';
      return page(200, layoutShell(html, { title: 'Demander une capsule — RPVD', description: 'Demande une capsule vidéo RPVD pour l’examen de ton enfant : matière, niveau, sujet. On la produit dès que trois familles la demandent.', canonical: `${base}/demande`, body }));
    }

    // /capsules : liste
    const { data: caps } = await db.from('capsules').select('slug,title,type,subject_area,level,price_cad').eq('published', true).order('published_at', { ascending: false });
    const items = (caps || []).map((c) => `<li><a href="/capsules/${e(c.slug)}">${e(c.title)}</a> — ${e(c.level)}, ${e(c.subject_area)} — ${money(c.price_cad)} CAD</li>`).join('');
    const body = `<main style="max-width:720px;margin:0 auto;padding:24px;font-family:sans-serif"><h1>Capsules RPVD</h1><p>Capsules vidéo sous-titrées pour réussir les examens de maths et de sciences (secondaire et cégep, Québec).</p><ul>${items}</ul><p><a href="/demande">Votre sujet n’y est pas ? Demandez-le.</a></p></main>`;
    return page(200, layoutShell(html, { title: 'Capsules RPVD — prêtes maintenant', description: 'Capsules vidéo sous-titrées qui enseignent une marche à suivre réutilisable pour les examens de maths et de sciences (Québec).', canonical: `${base}/capsules`, body }));
  } catch (err) {
    console.error('[seo]', err && err.message ? err.message : err);
    return { statusCode: 302, headers: { Location: '/index.html' }, body: '' };
  }
};
