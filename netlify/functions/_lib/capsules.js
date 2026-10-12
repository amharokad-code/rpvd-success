'use strict';
// Capsules RPVD (pivot parents) : produits, normalisation des sujets, dates, accès.

const { siteUrl } = require('./legal');

// Prix en cents CAD (paiement unique). Source unique côté serveur.
const PRICES = { concept: 2400, exam: 2900, bootcamp: 9900 };
const PWA_CODE_PRODUCTS = ['exam', 'bootcamp']; // produits qui incluent l'essai PWA 30 jours
const PWA_TRIAL_DAYS = 30;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// « Équation du 2e degré » et « equation du 2e degre » comptent pour le même sujet.
function topicKey(topic) {
  return String(topic || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function clean(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

// Date du jour au Québec (YYYY-MM-DD).
function todayQuebec(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

// Jours entre aujourd'hui (Québec) et une date YYYY-MM-DD (positif = dans le futur).
function daysUntil(dateStr, now = new Date()) {
  const a = Date.parse(`${todayQuebec(now)}T00:00:00Z`);
  const b = Date.parse(`${dateStr}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

function formatDateFr(dateStr) {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${dateStr}T00:00:00Z`));
}

function capsuleUrl(slug, token) {
  return `${siteUrl()}/capsule/${encodeURIComponent(slug)}${token ? `?t=${encodeURIComponent(token)}` : ''}`;
}

function unsubscribeLinksFor(requestId) {
  const q = `c=${encodeURIComponent(requestId)}`;
  return {
    page: `${siteUrl()}/desabonner?${q}`,
    oneClick: `${siteUrl()}/.netlify/functions/capsule-unsubscribe?${q}`,
    label: 'Ne plus recevoir ces courriels',
  };
}

// Champs publics d'une capsule : jamais video_url ni subtitles_url.
function publicCapsule(c) {
  return {
    slug: c.slug,
    title: c.title,
    type: c.type,
    subject_area: c.subject_area,
    topic: c.topic,
    level: c.level,
    price_cad: c.price_cad,
    duration_min: c.duration_min,
  };
}

module.exports = { PRICES, PWA_CODE_PRODUCTS, PWA_TRIAL_DAYS, EMAIL_PATTERN, UUID, topicKey, clean, todayQuebec, daysUntil, formatDateFr, capsuleUrl, unsubscribeLinksFor, publicCapsule };
