'use strict';
// Parsing tolérant de la sortie JSON de Gemini (LaTeX mal échappé). Un échec final LANCE : l'appelant
// bascule alors sur le modèle suivant de la chaîne au lieu de répondre 502.

const deepMap = (v, fn) =>
  typeof v === 'string' ? fn(v)
  : Array.isArray(v) ? v.map((x) => deepMap(x, fn))
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepMap(x, fn)]))
  : v;

// \f, \b, \t, \r sont des échappements JSON valides : un LaTeX mal échappé (\frac, \beta, \theta, \rho)
// ne fait PAS planter le parse, il corrompt la chaîne. On les restaure après coup.
const repairLatex = (s) => s
  .replace(/\f/g, '\\f')
  .replace(/\x08/g, '\\b')
  .replace(/\t(?=(heta|imes|ext|au|an|ilde))/g, '\\t')
  .replace(/\r(?=(ho|ightarrow|ight|angle))/g, '\\r');

function safeParseGemini(raw) {
  const clean = String(raw).replace(/^\s*```(?:json)?\s*|\s*```\s*$/gi, '').trim();
  let obj;
  try {
    obj = JSON.parse(clean);
  } catch (_) {
    const fixed = clean.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
    obj = JSON.parse(fixed); // si ça jette encore : laisser remonter pour déclencher le fallback
  }
  return deepMap(obj, repairLatex);
}

module.exports = { safeParseGemini, repairLatex };
