'use strict';
// Analyse d'un devoir (image ou PDF) via l'API REST Gemini, sans SDK.
// Produit l'objet `Analysis` du contrat §1 : template + slots rendus côté serveur.

const { HttpError } = require('./http');
const { safeParseGemini } = require('./safeParse');
const { buildSystemPrompt } = require('../_prompts/commun-v3');

// gemini-1.5/2.0/2.5-flash sont retirés pour cette clé (404 « no longer available to new
// users », malgré /v1beta/models qui les liste encore). Et gemini-3.6/3.7/3.5-flash + flash-latest
// (essayés ensuite) sont des modèles trop récents/« preview » : vus en prod ET en test direct
// répondant 503 « high demand » de façon quasi systématique, avec des latences de 7 à 30s même
// quand ils finissent par répondre — instables au point de faire échouer TOUTE la chaîne de repli
// en même temps (les 4 à la fois, un soir de test réel). gemini-3.1-flash-lite est un modèle
// « lite » établi, moins demandé : 6/6 succès sur deux séries de tests avec le payload réel
// (vision + schéma JSON complet), 1-3.5s à chaque fois. Nouveau modèle principal.
// Chaîne 100% « lite » — plus aucun membre de la famille flash-3.x/3.6/3.7 instable, y compris
// en dernier repli (gemini-3.5-flash a été retiré : même famille surchargée que la primaire
// d'avant, ça n'aurait fait que reproduire le même problème une fois les 2 premiers replis épuisés).
const GEMINI_MODEL = 'gemini-3.1-flash-lite';
const MODEL_CHAIN = [GEMINI_MODEL, 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite-preview'];
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
// 12s par modèle (pas 25s) : vu en prod, un essai qui traîne jusqu'à ~25.8s au total flirtait
// avec la limite d'exécution de la plateforme Netlify elle-même (le process se ferait tuer AVANT
// notre propre AbortController). À 12s/modèle, deux essais (principal + repli) tiennent sous 26s.
const TIMEOUT_MS = 12000;
const SUBJECTS = ['math', 'chimie', 'physique', 'sciences', 'histoire', 'francais', 'anglais', 'autre'];
const MIN_STEPS = 2;
// Plafond relevé (contrat) : un exercice complexe doit pouvoir produire une décomposition
// aussi longue que nécessaire plutôt que d'être artificiellement coupée à 7 étapes — l'UI
// (AnalysisEngine/ArbreCheminement) scrolle désormais au lieu de déborder.
const MAX_STEPS = 14;
const MAX_NOTATION_CHARS = 300;

// Index du premier modèle qui a répondu (mémorisé le temps de vie du conteneur).
let activeModelIndex = 0;

// Schéma de réponse imposé à Gemini — Moteur D « RPVD Visuel v2 » (section 12 du prompt).
const LEVEL_SCHEMA = {
  type: 'OBJECT',
  properties: {
    niveau: { type: 'INTEGER', description: '1, 2 ou 3.' },
    connu: { type: 'STRING', description: "Variables ou mots-clés de l'énoncé, séparés par des virgules (jamais de phrase)." },
    cherche: { type: 'STRING', description: 'UNE variable ou UN mot-clé (jamais de formule ni de « = »).' },
    schema_ascii: { type: 'STRING', description: 'Schéma ASCII (niveau 1 seulement, 30 car. max de large, 8 lignes max) ou chaîne vide.' },
    demarche: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          expression: { type: 'STRING', description: 'Expression en LaTeX ($...$).' },
          explication: { type: 'STRING', description: 'Action ou raison en 3 à 10 mots.' },
        },
        required: ['expression', 'explication'],
      },
    },
    reponse: { type: 'STRING' },
    principe: { type: 'STRING', description: '2 à 3 lignes, sans formule ni calcul.' },
    verification: { type: 'STRING', description: 'Une ligne de 6 à 16 mots pour tester la réponse (v3).' },
  },
  required: ['niveau', 'connu', 'cherche', 'schema_ascii', 'demarche', 'reponse', 'principe'],
};

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    statut: { type: 'STRING', format: 'enum', enum: ['ok', 'incomplet'] },
    message: { type: 'STRING', description: "Phrase d'explication si incomplet, sinon chaîne vide." },
    matiere_cible: { type: 'STRING', description: 'Ex. « Chimie / Solutions et dilution ».' },
    mode: { type: 'STRING', description: 'calcul ou raisonnement.' },
    type_question: { type: 'STRING', description: 'Mode raisonnement : type de question (section 4).' },
    pattern_key: { type: 'STRING', description: 'matiere/famille/forme (v3.3).' },
    declencheurs: { type: 'ARRAY', items: { type: 'STRING' }, description: '2 à 4 signaux de reconnaissance.' },
    piege: { type: 'STRING', description: 'Erreur la plus fréquente, 8 à 20 mots.' },
    confiance: { type: 'STRING', format: 'enum', enum: ['haute', 'moyenne', 'basse'] },
    a_verifier: { type: 'STRING', description: 'Une phrase si confiance != haute.' },
    niveaux: { type: 'ARRAY', items: LEVEL_SCHEMA, description: 'Exactement 3 objets : niveau 1, 2, 3.' },
    cheminement: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING', format: 'enum', enum: ['concept', 'action'] },
          texte: { type: 'STRING', description: '2 à 5 mots.' },
        },
        required: ['type', 'texte'],
      },
    },
    hint: { type: 'STRING', description: 'Une SEULE phrase qui débloque la première ligne sans donner la démarche ni la réponse.' },
    pitfall: { type: 'STRING', description: "L'erreur la plus courante sur ce type d'exercice, 1-2 phrases." },
    consigne_translation: { type: 'STRING', description: "L'énoncé réécrit en mots très simples (pas de méthode, pas de réponse)." },
  },
  required: ['statut', 'message', 'matiere_cible', 'niveaux', 'cheminement'],
};

// Style de langue et jargon selon la région (contrat §3 — quadri-langue).
// `lang` pilote la langue de sortie du JSON ; `style` est l'instruction de ton/vocabulaire.
const REGION_STYLE = {
  qc: {
    lang: 'français',
    style:
      "Tu parles en français québécois, comme un grand frère ou une grande sœur cool : tutoiement, expressions comme « check », « c'est ben correct », « mon ami », « ben », « genre », et une référence occasionnelle au hockey si ça tombe bien. Zéro jargon d'école.",
  },
  fr: {
    lang: 'français',
    style:
      "Tu parles en français de France, comme un pote cool : tutoiement, expressions comme « regarde », « c'est génial », « mon pote », « capté », « franchement », et une référence occasionnelle au foot si ça tombe bien. Zéro jargon d'école.",
  },
  us: {
    lang: 'English (US)',
    style:
      'You talk like a high-energy, casual American friend: "Hey buddy", "Awesome", "Math is a breeze", occasional baseball or dollar-amount references when it fits. Zero academic jargon.',
  },
  uk: {
    lang: 'English (UK)',
    style:
      'You talk like a friendly, politely casual British mate: "Mate", "Brilliant", "Spot on", occasional football or pounds-amount references when it fits. Zero academic jargon.',
  },
};

const DEFAULT_REGION = 'qc';

// Nettoie la convention de notation avant injection (une ligne, longueur bornée).
function sanitizeNotation(value) {
  return String(value == null ? '' : value)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, MAX_NOTATION_CHARS);
}

// Instruction système : base du mode (calcul | raisonnement) + couche v3 + région + notation
// (voir netlify/functions/_prompts/commun-v3.js).
function buildSystemInstruction({ region, preferredNotation, mode = 'calcul' }) {
  return buildSystemPrompt({
    mode,
    region: REGION_STYLE[region] ? region : DEFAULT_REGION,
    notation: sanitizeNotation(preferredNotation),
  });
}

// Remplace chaque {{i}} par slots[i][mode]. Retourne null si aucun trou ou slot manquant.
function renderTemplate(template, slots, mode) {
  if (typeof template !== 'string' || !Array.isArray(slots)) return null;
  if (mode !== 'generic' && mode !== 'value') return null;
  let count = 0;
  let valid = true;
  const rendered = template.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, index) => {
    count += 1;
    const slot = slots[Number(index)];
    const text = slot && typeof slot[mode] === 'string' ? slot[mode].trim() : '';
    if (!text) {
      valid = false;
      return '';
    }
    return text;
  });
  return valid && count > 0 ? rendered : null;
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

// Normalise la liste des slots ; null si un élément est incomplet (les index doivent tenir).
function normalizeSlots(raw) {
  if (!Array.isArray(raw)) return null;
  const slots = [];
  for (const item of raw) {
    const generic = cleanString(item && item.generic);
    const value = cleanString(item && item.value);
    if (!generic || !value) return null;
    slots.push({ generic, value });
  }
  return slots;
}

// Étapes valides uniquement, bornées à MAX_STEPS.
function normalizeSteps(raw) {
  if (!Array.isArray(raw)) return [];
  const steps = [];
  for (const item of raw) {
    const title = cleanString(item && item.title);
    const text = cleanString(item && item.text);
    if (title && text) steps.push({ title, text });
    if (steps.length >= MAX_STEPS) break;
  }
  return steps;
}

// Cheminement du Moteur D : [{ type: concept|action, texte }] → format de l'Arbre [{ type, text, isFormula }].
const CHEMINEMENT_TYPES = ['concept', 'action'];
const MAX_CHEMINEMENT_STEPS = 16;
function normalizeCheminement(raw) {
  if (!Array.isArray(raw)) return [];
  const steps = [];
  for (const item of raw) {
    const type = CHEMINEMENT_TYPES.includes(item && item.type) ? item.type : null;
    const text = cleanString(item && (item.texte || item.text));
    if (!type || !text) continue;
    steps.push({ type, text, isFormula: false });
    if (steps.length >= MAX_CHEMINEMENT_STEPS) break;
  }
  return steps;
}

const MAX_DEMARCHE_LINES = 20;
const MAX_ASCII_LINES = 8;
const MAX_ASCII_WIDTH = 40;

function normalizeAscii(value, index) {
  if (index !== 0) return '';
  const text = String(value == null ? '' : value).replace(/\s+$/, '');
  if (!text.trim()) return '';
  const lines = text.split('\n');
  if (lines.length > MAX_ASCII_LINES || lines.some((line) => line.length > MAX_ASCII_WIDTH)) return '';
  return text;
}

// « $\text{Quel est le fait ?}$ » → « Quel est le fait ? » : le mode raisonnement enveloppe parfois du texte pur dans du LaTeX.
const unwrapText = (value) => {
  const m = /^\$\\text\{([^{}$]*)\}\$$/.exec(String(value == null ? '' : value).trim());
  return m ? m[1] : value;
};

function normalizeLevel(item, index) {
  if (!item || typeof item !== 'object') return null;
  const demarche = (Array.isArray(item.demarche) ? item.demarche : [])
    .map((line) => ({ expression: cleanString(unwrapText(line && line.expression)), explication: cleanString(unwrapText(line && line.explication)) }))
    .filter((line) => line.expression)
    .slice(0, MAX_DEMARCHE_LINES);
  if (demarche.length === 0) return null;
  return {
    niveau: index + 1,
    connu: cleanString(item.connu),
    cherche: cleanString(item.cherche),
    schema_ascii: normalizeAscii(item.schema_ascii, index),
    demarche,
    reponse: cleanString(unwrapText(item.reponse)),
    principe: cleanString(item.principe),
    verification: typeof item.verification === 'string' ? item.verification.trim() : '',
  };
}

// Sortie exploitable : fiche incomplète signalée par Gemini, OU 3 niveaux avec une démarche chacun.
// Utilisée par runGeminiJson : sinon on bascule sur le modèle suivant de la chaîne.
function isUsableRaw(raw) {
  if (!raw || typeof raw !== 'object') return false;
  if (raw.statut === 'incomplet') return true;
  return Array.isArray(raw.niveaux) && raw.niveaux.length === 3 && raw.niveaux.every((l, i) => normalizeLevel(l, i));
}

function guessSubject(matiere) {
  const m = String(matiere || '').toLowerCase();
  if (/math/.test(m)) return 'math';
  if (/chim|chem/.test(m)) return 'chimie';
  if (/phys/.test(m)) return 'physique';
  if (/hist/.test(m)) return 'histoire';
  if (/scien/.test(m)) return 'sciences';
  if (/fran|french/.test(m)) return 'francais';
  if (/angl|english/.test(m)) return 'anglais';
  return 'autre';
}

const asLines = (level) =>
  level.demarche.map((l) => (l.explication ? l.expression + ' (' + l.explication + ')' : l.expression)).join('\n');

// Clé de pattern v3.3 : matiere/famille/forme, minuscules, sans accent ; sinon clé « non classé ».
const normalizeKey = (k = '') => {
  const s = String(k)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9/-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/\/+/g, '/')
    .replace(/^[-/]+|[-/]+$/g, '');
  return /^[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+$/.test(s) ? s : 'autre/non-classe/non-classe';
};

// Validation douce des champs v3 : jamais de 502 pour un champ manquant.
function finalizeFiche(f) {
  f.pattern_key = normalizeKey(f.pattern_key);
  f.declencheurs = Array.isArray(f.declencheurs) ? f.declencheurs.slice(0, 4).map(String) : [];
  f.piege = typeof f.piege === 'string' ? f.piege : '';
  f.confiance = ['haute', 'moyenne', 'basse'].includes(f.confiance) ? f.confiance : 'moyenne';
  f.a_verifier = f.confiance === 'haute' ? '' : String(f.a_verifier || '');
  (f.niveaux || []).forEach((n) => {
    n.verification = typeof n.verification === 'string' ? n.verification : '';
  });
  return f;
}

// Valide la sortie Moteur D et construit l'Analysis : le format v2 (niveaux, cheminement) pour le
// rendu visuel + les champs historiques (level_1/2/3_steps, final_answer...) pour la bibliothèque,
// le générateur de clones, la veille d'examen et l'app mobile.
function buildAnalysis(raw) {
  if (!raw || typeof raw !== 'object') throw new HttpError(502, 'AI_ERROR');

  // Fiche incomplète (photo floue, donnée coupée, pas un exercice) → OCR_FAIL : message précis de
  // Gemini, crédit remboursé par l'appelant.
  if (raw.statut === 'incomplet') {
    throw new HttpError(422, 'OCR_FAIL', cleanString(raw.message) || undefined);
  }

  const niveaux = (Array.isArray(raw.niveaux) ? raw.niveaux.slice(0, 3) : []).map(normalizeLevel);
  if (niveaux.length < 3 || niveaux.some((l) => !l)) throw new HttpError(502, 'AI_ERROR');
  const [n1, n2, n3] = niveaux;

  const matiere = cleanString(raw.matiere_cible);
  const v3 = finalizeFiche({
    pattern_key: raw.pattern_key,
    declencheurs: raw.declencheurs,
    piege: cleanString(raw.piege) || cleanString(raw.pitfall),
    confiance: raw.confiance,
    a_verifier: raw.a_verifier,
    niveaux,
  });
  const steps = n3.demarche.map((l) => ({ title: l.expression, text: l.explication || l.expression }));

  return {
    moteur: 3,
    mode: raw.mode === 'raisonnement' ? 'raisonnement' : 'calcul',
    type_question: cleanString(raw.type_question),
    pattern_key: v3.pattern_key,
    declencheurs: v3.declencheurs,
    piege: v3.piege,
    confiance: v3.confiance,
    a_verifier: v3.a_verifier,
    problem_type: matiere || 'Exercice',
    subject_guess: guessSubject(matiere),
    matiere_cible: matiere,
    niveaux,
    cheminement: normalizeCheminement(raw.cheminement),
    // Champs historiques (voir commentaire de la fonction).
    template: '',
    slots: [],
    level_1: asLines(n1),
    level_2: asLines(n2),
    level_3_steps: steps,
    final_answer: n3.reponse || n2.reponse || n1.reponse,
    hint: cleanString(raw.hint),
    pitfall: v3.piege,
    consigne_translation: cleanString(raw.consigne_translation),
  };
}

function getApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_API_KEY || '';
}

// Masque la clé dans tout message destiné aux logs.
function scrub(message, key) {
  const text = String(message == null ? '' : message);
  return key ? text.split(key).join('***') : text;
}

// Extrait et parse (tolérant au LaTeX mal échappé) le JSON de la réponse Gemini ; null si inexploitable.
function extractJson(payload) {
  const candidate = payload && Array.isArray(payload.candidates) ? payload.candidates[0] : null;
  const parts = candidate && candidate.content && Array.isArray(candidate.content.parts) ? candidate.content.parts : [];
  const text = parts.map((part) => (typeof part.text === 'string' ? part.text : '')).join('').trim();
  if (!text) return null;
  try {
    return safeParseGemini(text);
  } catch (_) {
    return null;
  }
}

// Un appel generateContent sur un modèle donné, avec timeout. Marque les 404 modèle ET les
// erreurs transitoires (503 « high demand », 429 quota) comme repliables sur le modèle suivant —
// vu en prod : gemini-3.6-flash renvoie parfois 503 UNAVAILABLE sous forte charge, et ça ne doit
// pas se traduire par un 502 immédiat côté client alors que gemini-2.5-flash répond, lui.
async function callModel(model, body, key) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (response.status === 404) {
      const notFound = new Error(`Modèle ${model} introuvable (404)`);
      notFound.modelNotFound = true;
      throw notFound;
    }
    if (response.status === 503 || response.status === 429) {
      const detail = await response.text().catch(() => '');
      const transient = new Error(`Gemini HTTP ${response.status} (transitoire) : ${detail.slice(0, 300)}`);
      transient.modelNotFound = true;
      throw transient;
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Gemini HTTP ${response.status}: ${detail.slice(0, 300)}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

// Point d'entrée : image/PDF en base64 → Analysis. Lance HttpError(502, 'AI_ERROR') en cas d'échec.
// `notationImage` (optionnel) : photo d'exemple de la notation demandée par l'élève — jamais
// stockée (contrat vie privée), envoyée telle quelle en pièce jointe supplémentaire à Gemini,
// juste pour cette analyse.
// Estimation de coût (contrat "logue chaque appel, connais le coût réel") — tarif par million
// de tokens input/output. À corriger si la tarification réelle de gemini-3.1-flash-lite diffère ;
// gardé en une seule constante pour être facile à ajuster sans chercher dans tout le fichier.
const COST_PER_MILLION_INPUT_TOKENS = 0.25;
const COST_PER_MILLION_OUTPUT_TOKENS = 1.5;

function estimateCost(inputTokens, outputTokens) {
  return (inputTokens * COST_PER_MILLION_INPUT_TOKENS + outputTokens * COST_PER_MILLION_OUTPUT_TOKENS) / 1_000_000;
}

// Chaîne de repli + métriques, factorisée pour tout appel Gemini JSON (image ou texte seul) —
// utilisée par analyzeImage, generateClone, generateExamPrep, analyzeTentative (Phase 1/6/7,
// RPVD_FEATURES_PROMPT.md). Lance HttpError(502, 'AI_ERROR') si aucun modèle ne répond.
async function runGeminiJson(body, taskType, validate) {
  const startTime = Date.now();
  const key = getApiKey();
  if (!key) {
    console.error('[gemini] GEMINI_API_KEY manquante.');
    throw new HttpError(502, 'AI_ERROR');
  }

  let payload = null;
  let raw = null;
  let modelUsed = null;
  let finishReason = 'inconnu';
  for (let i = activeModelIndex; i < MODEL_CHAIN.length; i += 1) {
    const model = MODEL_CHAIN[i];
    try {
      const candidatePayload = await callModel(model, body, key);
      if (candidatePayload.promptFeedback && candidatePayload.promptFeedback.blockReason) {
        payload = candidatePayload; // bloqué : traité plus bas, inutile d'essayer un autre modèle
        modelUsed = model;
        break;
      }
      const finish = candidatePayload.candidates && candidatePayload.candidates[0] ? candidatePayload.candidates[0].finishReason : 'inconnu';
      // JSON illisible (ex. MAX_TOKENS) ou structure incomplète : repli sur le modèle suivant, pas de 502.
      const parsed = extractJson(candidatePayload);
      if (!parsed || (validate && !validate(parsed))) {
        const unusable = new Error(parsed ? 'Structure JSON incomplète' : 'Réponse sans JSON exploitable');
        unusable.message += ` (finishReason: ${finish})`;
        unusable.modelNotFound = true;
        throw unusable;
      }
      payload = candidatePayload;
      raw = parsed;
      activeModelIndex = i;
      modelUsed = model;
      finishReason = finish;
      break;
    } catch (err) {
      // Repliable : modèle retiré (404), surcharge transitoire (503/429, voir callModel) OU
      // délai dépassé (souvent le même symptôme qu'un 503 — le modèle rame sous forte charge).
      const isTimeout = err && err.name === 'AbortError';
      const retryable = Boolean(err && err.modelNotFound) || isTimeout;
      const reason = isTimeout ? `délai dépassé (${TIMEOUT_MS} ms)` : scrub(err && err.message, key);
      if (retryable && i + 1 < MODEL_CHAIN.length) {
        console.warn(`[gemini] ${model} indisponible (${reason}), repli sur ${MODEL_CHAIN[i + 1]}.`);
        continue;
      }
      console.error(`[gemini] Échec ${model} : ${reason}`);
      throw new HttpError(502, 'AI_ERROR');
    }
  }

  if (!payload) throw new HttpError(502, 'AI_ERROR');

  if (payload.promptFeedback && payload.promptFeedback.blockReason) {
    console.error(`[gemini] Contenu bloqué : ${payload.promptFeedback.blockReason}`);
    throw new HttpError(502, 'AI_ERROR', "L'analyse a été bloquée. Essaie avec une autre photo, ton crédit est remboursé.");
  }

  if (!raw) throw new HttpError(502, 'AI_ERROR');

  // Phase 0.2 (RPVD_FEATURES_PROMPT.md) : "logue chaque appel Gemini, connais le coût réel".
  // Le nom des champs suit la casse de l'API Gemini (usageMetadata.*TokenCount).
  const usage = payload.usageMetadata || {};
  const inputTokens = Number(usage.promptTokenCount) || 0;
  const outputTokens = Number(usage.candidatesTokenCount) || 0;
  const metrics = {
    taskType,
    thinkingBudgetUsed: body.generationConfig.thinkingConfig.thinkingBudget,
    latencyMs: Date.now() - startTime,
    inputTokens,
    outputTokens,
    totalTokens: Number(usage.totalTokenCount) || inputTokens + outputTokens,
    estimatedCostUsd: estimateCost(inputTokens, outputTokens),
    modelUsed,
    finishReason,
  };
  console.log('ANALYSIS_METRIC', JSON.stringify(metrics));

  return { raw, metrics };
}

async function analyzeImage({
  base64,
  mimeType,
  region = DEFAULT_REGION,
  preferredNotation = '',
  notationImage = null,
  taskType = 'full_analysis',
  mode = 'calcul',
}) {
  const userParts = [
    { inlineData: { mimeType, data: base64 } },
    { text: "Voici le devoir. Analyse-le et renvoie uniquement le JSON demandé." },
  ];
  if (notationImage && notationImage.base64 && notationImage.mimeType) {
    userParts.push(
      { inlineData: { mimeType: notationImage.mimeType, data: notationImage.base64 } },
      {
        text: "L'image ci-dessus est un EXEMPLE de la notation/démarche demandée par l'élève (pas un exercice à résoudre) — imite ce style d'écriture (symboles, ordre, niveau de détail) dans la démarche des 3 niveaux.",
      },
    );
  }

  const body = {
    systemInstruction: { parts: [{ text: buildSystemInstruction({ region, preferredNotation, mode }) }] },
    contents: [{ role: 'user', parts: userParts }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.4,
      // 2048 suffisait avant l'ajout de `cheminement` (contrat rebrand) : le schéma JSON plus
      // gros (jusqu'à 10 étapes en plus des slots/level_3_steps/template) dépassait le budget
      // et Gemini tronquait la réponse en plein milieu (finishReason: MAX_TOKENS), donc un JSON
      // invalide → 502 systématique en prod. Vu en direct dans les logs Netlify.
      // Relevé avec MAX_STEPS/MAX_CHEMINEMENT_STEPS (14/16) : un exercice complexe qui utilise
      // vraiment tout ce plafond produit un JSON plus gros que ce que 8192 couvrait.
      maxOutputTokens: 12288,
      // Réflexion prolongée (contrat) : même modèle flash-lite, budget de raisonnement interne
      // plus généreux avant de répondre — meilleure qualité pédagogique sur les cas ambigus,
      // sans changer de modèle ni retomber sur la famille flash-3.x instable.
      thinkingConfig: { thinkingBudget: 4096 },
    },
  };

  const { raw, metrics } = await runGeminiJson(body, taskType, isUsableRaw);
  const analysis = buildAnalysis(raw);
  // Le mode demandé fait foi (le modèle peut oublier le champ « mode »).
  analysis.mode = mode === 'raisonnement' ? 'raisonnement' : 'calcul';
  return { analysis, metrics };
}

// -----------------------------------------------------------------------------
// Phase 1 (RPVD_FEATURES_PROMPT.md) — Générateur de clones. Texte seul (pas de photo) :
// Gemini reçoit l'énoncé niveau 1 déjà généré et produit un exercice au même pattern.
// -----------------------------------------------------------------------------
const CLONE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    cloneExercise: { type: 'STRING', description: "L'énoncé complet du clone, dans la langue de réponse." },
    correctAnswer: { type: 'STRING', description: 'La réponse exacte, courte (ex. « x = 5 »).' },
    steps: { type: 'ARRAY', items: { type: 'STRING' }, description: '2 à 6 étapes courtes de résolution.' },
  },
  required: ['cloneExercise', 'correctAnswer', 'steps'],
};

function buildClonePrompt({ problemType, level1, lang }) {
  return [
    `Tu es un tuteur qui aide un ado du secondaire. L'exercice original était de type « ${problemType} », dont voici la méthode générale : ${level1}`,
    '',
    'Génère UN clone de cet exercice :',
    '- Mêmes pattern et structure mathématique que l\'original.',
    '- Nombres différents, qui donnent une réponse propre (pas de décimales infinies).',
    '- Contexte du monde réel différent si l\'original en avait un.',
    '',
    `Réponds UNIQUEMENT avec le JSON demandé, en ${lang}. N'ajoute AUCUNE explication en dehors du JSON, ne donne pas la démarche complète dans "cloneExercise" (juste l'énoncé).`,
  ].join('\n');
}

async function generateClone({ problemType, level1, region = DEFAULT_REGION }) {
  const { lang } = REGION_STYLE[region] || REGION_STYLE[DEFAULT_REGION];
  const body = {
    contents: [{ role: 'user', parts: [{ text: buildClonePrompt({ problemType, level1, lang }) }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: CLONE_SCHEMA,
      // Variation maximale voulue (contrat) : on ne veut pas un clone quasi-identique à chaque fois.
      temperature: 1.0,
      maxOutputTokens: 2048,
      // Sortie courte et peu ambiguë (juste un énoncé + réponse) : pas besoin du budget de
      // réflexion complet de l'analyse principale.
      thinkingConfig: { thinkingBudget: 1024 },
    },
  };

  const { raw, metrics } = await runGeminiJson(body, 'generate_clone');

  const exercise = cleanString(raw.cloneExercise);
  const correctAnswer = cleanString(raw.correctAnswer);
  const steps = Array.isArray(raw.steps) ? raw.steps.map(cleanString).filter(Boolean) : [];

  // Validation minimale (contrat) : un clone sans énoncé ou sans réponse ne sert à rien et ne
  // doit jamais être stocké ni facturé au crédit de l'élève.
  if (!exercise || !correctAnswer || steps.length === 0) {
    console.error('[gemini] Clone invalide (champ manquant).');
    throw new HttpError(502, 'AI_ERROR');
  }

  return { clone: { exercise, correctAnswer, steps }, metrics };
}

// -----------------------------------------------------------------------------
// Phase 6 (RPVD_FEATURES_PROMPT.md) — Mode Veille d'Exam : les patterns critiques d'un examen.
// -----------------------------------------------------------------------------
const EXAM_PREP_SCHEMA = {
  type: 'OBJECT',
  properties: {
    patterns: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          importance: { type: 'STRING' },
          exampleQuestion: { type: 'STRING' },
          frequency: { type: 'STRING', format: 'enum', enum: ['rarely', 'sometimes', 'often', 'always'] },
        },
        required: ['name', 'importance', 'exampleQuestion', 'frequency'],
      },
    },
  },
  required: ['patterns'],
};

function buildExamPrepPrompt({ examTitle, lang }) {
  return [
    `L'élève a un examen : "${examTitle}"`,
    '',
    'Liste les 5 PATTERNS les plus importants qui représentent 80% des questions probables.',
    'Pour chaque pattern : le nom, pourquoi c\'est crucial (1 phrase), un exemple rapide de question, et la fréquence probable (rarely/sometimes/often/always — toujours en anglais, c\'est une clé technique).',
    '',
    `Réponds UNIQUEMENT avec le JSON demandé. Le texte (name, importance, exampleQuestion) est en ${lang}, ton casual, zéro jargon scolaire formel.`,
  ].join('\n');
}

async function generateExamPrep({ examTitle, region = DEFAULT_REGION }) {
  const { lang } = REGION_STYLE[region] || REGION_STYLE[DEFAULT_REGION];
  const body = {
    contents: [{ role: 'user', parts: [{ text: buildExamPrepPrompt({ examTitle, lang }) }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: EXAM_PREP_SCHEMA,
      temperature: 0.8,
      maxOutputTokens: 2048,
      thinkingConfig: { thinkingBudget: 1024 },
    },
  };

  const { raw, metrics } = await runGeminiJson(body, 'exam_preparation');
  const FREQUENCIES = ['rarely', 'sometimes', 'often', 'always'];
  const patterns = (Array.isArray(raw.patterns) ? raw.patterns : [])
    .map((item) => ({
      name: cleanString(item && item.name),
      importance: cleanString(item && item.importance),
      exampleQuestion: cleanString(item && item.exampleQuestion),
      frequency: FREQUENCIES.includes(item && item.frequency) ? item.frequency : 'sometimes',
    }))
    .filter((item) => item.name && item.importance);

  if (patterns.length === 0) throw new HttpError(502, 'AI_ERROR');

  return { patterns, metrics };
}

// -----------------------------------------------------------------------------
// Phase 7 (RPVD_FEATURES_PROMPT.md) — Photo de tentative : localise l'erreur dans la copie de
// l'élève. Le prompt d'origine suggérait une chaîne de modèles plus « forts » (3.5/3.6-flash)
// pour cette tâche — DÉLIBÉRÉMENT PAS FAIT ICI : cette famille de modèles est celle qui causait
// des pannes en prod (503 « high demand » quasi systématiques, voir commentaire en tête de
// fichier) et le projet vient justement de converger sur flash-lite pour la stabilité. Réutilise
// la même chaîne stable que le reste — un modèle plus adapté sera reconsidéré seulement si la
// validation manuelle ci-dessous montre que flash-lite ne suffit pas.
// ⚠️ Pas encore validée sur de vraies copies d'élèves (voir PROJECT_HANDOFF.md) : la précision
// réelle du diagnostic n'a jamais été mesurée manuellement sur un échantillon, contrairement à
// ce que le contrat exige avant un lancement public de cette feature précise.
// -----------------------------------------------------------------------------
const TENTATIVE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    hasError: { type: 'BOOLEAN', description: "true si la tentative de l'élève contient une erreur." },
    errorLocation: { type: 'STRING', description: "Où se trouve l'erreur (ex. « étape 2 », description courte)." },
    errorExplanation: { type: 'STRING', description: "Explique gentiment ce qui cloche, sans donner directement la suite." },
    encouragement: { type: 'STRING', description: 'Une phrase positive, peu importe le résultat.' },
  },
  required: ['hasError', 'errorLocation', 'errorExplanation', 'encouragement'],
};

function buildTentativePrompt({ lang, style }) {
  return [
    "Tu es RPVD, un ami qui aide un ado du secondaire à comprendre ses devoirs.",
    style,
    "La PREMIÈRE image est l'exercice original. La DEUXIÈME image est la tentative de résolution de l'élève.",
    "Compare les deux : est-ce que la tentative contient une erreur ? Si oui, localise-la précisément et explique gentiment ce qui cloche, SANS donner directement la suite de la solution.",
    '',
    `Réponds UNIQUEMENT avec le JSON demandé, en ${lang}, ton casual, zéro jargon scolaire formel.`,
  ].join('\n');
}

async function analyzeTentative({ exerciseImage, attemptImage, region = DEFAULT_REGION }) {
  const { lang, style } = REGION_STYLE[region] || REGION_STYLE[DEFAULT_REGION];
  const body = {
    systemInstruction: { parts: [{ text: buildTentativePrompt({ lang, style }) }] },
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: exerciseImage.mimeType, data: exerciseImage.base64 } },
          { inlineData: { mimeType: attemptImage.mimeType, data: attemptImage.base64 } },
          { text: 'Compare ces deux images et renvoie uniquement le JSON demandé.' },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: TENTATIVE_SCHEMA,
      temperature: 0.3,
      maxOutputTokens: 2048,
      // Reste fort (contrat §7.1) : localiser une erreur dans une copie manuscrite est plus
      // exigeant qu'une analyse initiale, on ne réduit pas le budget de réflexion ici.
      thinkingConfig: { thinkingBudget: 4096 },
    },
  };

  const { raw, metrics } = await runGeminiJson(body, 'analyze_tentative');
  return {
    result: {
      hasError: Boolean(raw.hasError),
      errorLocation: cleanString(raw.errorLocation),
      errorExplanation: cleanString(raw.errorExplanation),
      encouragement: cleanString(raw.encouragement),
    },
    metrics,
  };
}

module.exports = {
  GEMINI_MODEL,
  MODEL_CHAIN,
  TIMEOUT_MS,
  RESPONSE_SCHEMA,
  SUBJECTS,
  analyzeImage,
  generateClone,
  generateExamPrep,
  analyzeTentative,
  renderTemplate,
  buildAnalysis,
  buildSystemInstruction,
  isUsableRaw,
  normalizeKey,
  finalizeFiche,
};
