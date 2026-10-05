'use strict';
// Identité légale du commerçant (source unique : src/legal/business.json, aussi lue par le site)
// et liens de désabonnement (LCAP : tout courriel d'annonce doit identifier l'expéditeur, donner
// son adresse postale et offrir un désabonnement simple, traité sans délai).

const BUSINESS = require('../../../src/legal/business.json');

function siteUrl() {
  return (process.env.URL || 'https://rpvdsuccess.com').replace(/\/+$/, '');
}

// Ligne d'identification en bas de chaque courriel.
function senderLine() {
  return [BUSINESS.operator, BUSINESS.postalAddress || BUSINESS.city, BUSINESS.email].filter(Boolean).join(' · ');
}

// kind : 'v' (vote) ou 'b' (billet) ; id : UUID de la ligne (aucun courriel dans l'URL).
function unsubscribeLinks(kind, id) {
  if (!id) return null;
  const q = `${kind}=${encodeURIComponent(id)}`;
  return {
    page: `${siteUrl()}/desabonner?${q}`,
    oneClick: `${siteUrl()}/.netlify/functions/bootcamp-unsubscribe?${q}`,
  };
}

// En-têtes standard (Gmail/Yahoo) : désabonnement en un clic depuis la boîte de réception.
function unsubscribeHeaders(links) {
  if (!links) return undefined;
  return { 'List-Unsubscribe': `<${links.oneClick}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' };
}

module.exports = { BUSINESS, senderLine, unsubscribeLinks, unsubscribeHeaders, siteUrl };
